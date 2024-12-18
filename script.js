// Configuración inicial del video y canvas
const video = document.createElement("video");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
const manualInput = document.getElementById("manualInput");
const plateList = document.getElementById("plateList");
const errorMsg = document.getElementById("errorMsg");

// Iniciar la cámara trasera
navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" }
}).then((stream) => {
    video.srcObject = stream;
    video.play();
}).catch((err) => {
    console.error("Error al acceder a la cámara:", err);
});

// Validar el formato de la patente
const validatePlateFormat = (text) => {
    const carPattern = /^[A-Z]{2,3}\s?\d{3}([A-Z]{0,2})?$/; // Formato de auto
    const motoPattern = /^\d{3}\s?[A-Z]{3}$|^[A-Z]\d{3}\s?[A-Z]{3}$/; // Formato de moto
    return carPattern.test(text) || motoPattern.test(text);
};

// Preprocesar la imagen
const preprocessImage = () => {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3; // Escala de grises
        const binary = avg > 127 ? 255 : 0; // Umbral binarizado
        data[i] = data[i + 1] = data[i + 2] = binary; // Asignar el valor binarizado
    }

    context.putImageData(imageData, 0, 0);
};

// Dibujar la franja de captura
const drawCaptureArea = () => {
    const captureHeight = canvas.height * 0.15;
    const captureY = (canvas.height - captureHeight) / 2;

    // Oscurecer el área fuera de la franja
    context.fillStyle = "rgba(0, 0, 0, 0.5)";
    context.fillRect(0, 0, canvas.width, captureY);
    context.fillRect(0, captureY + captureHeight, canvas.width, canvas.height - captureY - captureHeight);

    // Resaltar la franja de captura
    context.strokeStyle = "#00FF00";
    context.lineWidth = 3;
    context.strokeRect(0, captureY, canvas.width, captureHeight);

    return { captureY, captureHeight };
};

// Capturar el texto con Tesseract.js
const capturePlate = async () => {
    preprocessImage(); // Mejorar calidad de la imagen para OCR
    const { captureY, captureHeight } = drawCaptureArea();
    const captureImage = context.getImageData(0, captureY, canvas.width, captureHeight);

    const result = await Tesseract.recognize(captureImage, "eng", {
        logger: (m) => console.log(m),
    });

    const filteredText = result.data.text.split("\n")
        .map(line => line.trim())
        .filter(validatePlateFormat); // Filtrar solo formatos válidos

    if (filteredText.length > 0) {
        displayPlate(filteredText[0]);
    } else {
        errorMsg.textContent = "No se detectó una patente válida. Intenta nuevamente o usa el ingreso manual.";
    }
};

// Mostrar la patente detectada
const displayPlate = (plate) => {
    const listItem = document.createElement("li");
    listItem.textContent = plate;
    plateList.appendChild(listItem);
    errorMsg.textContent = ""; // Limpiar mensajes de error
};

// Ingreso manual de patente
manualInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        const plate = manualInput.value.trim().toUpperCase();
        if (validatePlateFormat(plate)) {
            displayPlate(plate);
            manualInput.value = ""; // Limpiar input
        } else {
            errorMsg.textContent = "El formato ingresado no es válido.";
        }
    }
});

// Dibujar el video en el canvas y aplicar mejoras
video.addEventListener("play", () => {
    const renderFrame = () => {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        drawCaptureArea();
        requestAnimationFrame(renderFrame);
    };
    renderFrame();
});

// Botón para capturar patente
const captureButton = document.getElementById("captureButton");
captureButton.addEventListener("click", capturePlate);
