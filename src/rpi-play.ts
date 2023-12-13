const Gpio = require('onoff').Gpio; // Para controlar el GPIO
const pwmPin = new Gpio(18, 'out'); // Asumiendo que estás usando el pin 18 para PWM
const AudioProcessor = require('node-audioprocessor'); // Biblioteca de procesamiento de audio

// Función para procesar el audio
export function processAudio(audioFilePath: string) {
  AudioProcessor.process(audioFilePath, function(amplitude: number) {
    const pwmValue = convertAmplitudeToPWM(amplitude);
    pwmPin.pwmWrite(pwmValue);
  });
}

// Función para convertir la amplitud a valor PWM
function convertAmplitudeToPWM(amplitude: number) {
    // Asumimos que la amplitud está normalizada entre -1 y 1
    // Primero, convertimos la amplitud a un rango de 0 a 1
    const normalizedAmplitude = (amplitude + 1) / 2;

    // Luego, escalamos este valor para que se ajuste al rango PWM (0-255)
    const pwmValue = Math.round(normalizedAmplitude * 255);

    return pwmValue;
}

// // Ruta del archivo de audio
// const audioFilePath = '/path/to/your/audio/file.wav';

// Iniciar el procesamiento
// processAudio(audioFilePath);
