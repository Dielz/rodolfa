// const Gpio = require('onoff').Gpio; // Para controlar el GPIO
// const pwmPin = new Gpio(18, 'out'); // Asumiendo que estás usando el pin 18 para PWM
// const AudioProcessor = require('node-audioprocessor'); // Biblioteca de procesamiento de audio
let fs = require('fs');
// let wav = require('node-wav');
const player = require('node-wav-player');

// Función para procesar el audio
export function processAudio(audioFilePath: string) {
  player.play({
    path: audioFilePath,
    sync: true
  }).then(() => {
    console.log('The wav file was played through.');
  }).catch((error: any) => {
    console.error(error);
  });
  // let buffer = fs.readFileSync(audioFilePath);

  // let result = wav.decode(buffer);

  // console.log(result.sampleRate);

  // console.log(result.channelData); // array of Float32Arrays

  // wav.encode(result.channelData, { sampleRate: result.sampleRate, float: true, bitDepth: 32 });


  // AudioProcessor.process(audioFilePath, function(amplitude: number) {
  //   const pwmValue = convertAmplitudeToPWM(amplitude);
  //   // pwmPin.pwmWrite(pwmValue);
  //   console.log(pwmValue); // Imprimir el valor PWM en la consola
  // });

  //const audioPlayer = new Audio('file:///' + audioFilePath);
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
