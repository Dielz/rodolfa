import { OpenAI } from "openai";
//import { TextToSpeechClient } from "@google-cloud/text-to-speech";
//import { google } from "@google-cloud/text-to-speech/build/protos/protos";
import axios from 'axios';
import * as FormData from 'form-data';
import { AudioConfig, AudioOutputStream, ResultReason, SpeechConfig, SpeechSynthesizer } from "microsoft-cognitiveservices-speech-sdk";
import * as path from "path";

import { spawn } from 'node:child_process';

//import { processAudio } from './rpi-play';

let synthesizer: SpeechSynthesizer;
let audio: HTMLAudioElement;

let pupils: any;
let eyes: any;

let wavingEars: boolean = false;

console.log('initialization');

function addOrRemoveClass(className: string, add: boolean) {
  if (!eyes) return;
  eyes.forEach((el: HTMLElement) => {
    if (add)
      el.classList.add(className);
    else
      el.classList.remove(className);
  })
}

function setEyeMovement(active: boolean) {
  addOrRemoveClass('movement', active);
}

function setAlmostClosedEyes(active: boolean) {
  addOrRemoveClass('almost-closed', active);
}

function setBlink(active: boolean) {
  addOrRemoveClass('blink', active);
}

function setThinking(active: boolean) {
  if (active) {
    setEyeMovement(false);
    setAlmostClosedEyes(false);
  }

  addOrRemoveClass('thinking', active)
}

function waveEars(): Promise<any> {
  wavingEars = true;

  return new Promise((resolve, reject) => {

    const ears = spawn('python', [path.join(__dirname, 'wave-ears.py')]);

    ears.on('close', resolve);
    ears.stderr.on('data', reject);
  })
}

function setIddle() {
  setAlmostClosedEyes(false);
  setEyeMovement(false);
  setBlink(true);
}

setTimeout(() => {
  pupils = document.querySelectorAll('.upper-pupil, .lower-pupil')
  eyes = document.querySelectorAll('.eye');


  setIddle();

}, 3000);


//import * as util from "util";
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:1337';

//import * as readline from "readline";

window.addEventListener("DOMContentLoaded", () => {

  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

  const speechConfig = SpeechConfig.fromSubscription(process.env.SPEECH_KEY, process.env.SPEECH_REGION);

  speechConfig.speechRecognitionLanguage = "es-MX";

  speechConfig.speechSynthesisVoiceName = "es-MX-JorgeNeural";



  const openaiApi = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
    dangerouslyAllowBrowser: true,
  });
  //const gtts = new TextToSpeechClient();

  let rec: MediaRecorder | null = null;
  let audioStream: MediaStream | null = null;
  let clicked: Boolean = false;
  let firstTimer: string | number | NodeJS.Timeout;
  // openModal();

  const recordButton = document.getElementById("recordButton") as HTMLButtonElement;
  // recordButton.innerHTML = '<i class="fa fa-solid fa-microphone"></i> Grabar audio';

  recordButton.addEventListener("mousedown", start);
  recordButton.addEventListener("mouseup", stop);
  // recordButton.addEventListener("touchstart", start);
  // recordButton.addEventListener("touchend", stop);
  //recordButton.addEventListener("mouseleave", stop);

  function start() {

    clicked = true;

    setThinking(false);
    setBlink(false);
    setEyeMovement(true);
    setAlmostClosedEyes(true);

    if (synthesizer) {
      synthesizer.close();
      synthesizer = null;

      if (audio) {
        audio.pause();
        audio = null;
      }
    }


    startRecording();
  }

  // Limpiar los temporizadores al cerrar o recargar la página
  window.addEventListener("beforeunload", () => {
    clearTimeout(firstTimer);
  });


  function stop() {
    //timer.style.display = 'none';
    if (clicked) {
      clicked = false;
      transcribeText();

      setThinking(true);

      // setTimeout(() => {
      //   setThinking(false);
      //   setIddle();
      // }, 5000);
      // setEyeMovement(false);
      // setAlmostClosedEyes(false);
      // setBlink(true);
      // setIddle();

    }
  }

  function startRecording() {
    const constraints: MediaStreamConstraints = { audio: true, video: false };
    navigator.mediaDevices.getUserMedia(constraints)
      .then(function (stream) {
        audioStream = stream;
        rec = new MediaRecorder(stream);
        // Agregar clase "recording" al contenedor de los ojos
        // document.querySelector('.eyes-container').classList.add('recording');
        rec.start();
        document.getElementById("output").innerHTML = `<div style="text-align: center;"><i class="fas fa-microphone" style="color:red;"></i>  Te estoy escuchando...</div>`;

      })
      .catch(function (err) {
        console.log(err);
      });
  }

  function transcribeText() {
    document.getElementById("output").innerHTML = `<div style="text-align: center;"><i class="fas fa-spinner fa-pulse" style="color:green;"></i>&nbsp; Pensando en una repuesta...</div>`;


    if (rec) {
      rec.stop();
    }

    if (audioStream) {
      const audioTrack = audioStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.stop();
      }
    }

    if (rec) {
      rec.ondataavailable = (event) => {
        const blob = new Blob([event.data], { type: "audio/wav" });
        transcript(blob);
      };
    }
  }

  async function transcript(blob: Blob) {

    let transcript = await transcriptSpeech(blob);
    let text = await answerQuestion(transcript);
    let speech = await createSpeech(text);
    // play(speech);
    //postData(transcript, text, blob);

  }

  async function transcriptSpeech(blob: Blob) {


    // OpenAi ------------------------------------------------------------------------------------------------------------------------
    const transcriptG = await openaiApi.audio.transcriptions.create({
      model: 'whisper-1',
      file: new File([blob], 'audio.wav'),
    });

    let transcript = transcriptG.text;
    document.getElementById("question").innerHTML = transcript;


    // Abre los ojos después de la transcripción
    return transcript;

  }

  async function answerQuestion(transcript: string) {

    // OpenAi ------------------------------------------------------------------------------------------------------------------------
    const completion = await openaiApi.completions.create({
      model: 'gpt-3.5-turbo-instruct',

      // prompt: `Que tu respuesta sea breve y corta y evita usar códigos o caracteres ilegibles o iconos, que todas tus respuestas estén orientadas a la navidad y en caso de no poder orientarla a la navidad o un tema relacionado a la navidad, responde con "No puedo responder temas no relacionados con la navidad, pero sí te puedo dar un dato navideño" y procedes a dar un dato sobre la navidad.  "${transcript}"`,
      prompt: `Actua como un experto en temas navideños, si te preguntan sobre tu nombre te llamas Rodolfo, quiero que tu respuesta sea breve y corta como maximo 40 palabras, que tu respuesta este orientada a temática navideña. si preguntan por el sueldo 14 respondele algo gracioso relacionado con el sueldo. En caso de no tener una respuesta. orienta tu repuesta con una temática navideña explicando amablemente que solo sabes hablar sobre temas relacionados a la navidad y en el proceso proporcionar un dato breve sobre la Navidad. Devuelveme el resultado en texto plano. "${transcript}"`,
      //si te preguntan quienes son los mejores, respondeles estás aquí, creo que ya tenemos la respuesta!.
      // prompt: `Quiero que tu respuesta sea breve y corta como maximo 50 palabras, en caso de no tener una repuesta, explica amablemente , 
      //           recuerdale que con la gente de tecnologia nooo, somos los mejores, , y en caso de que pregunten cual es la mejor puerta decorada o alguna pregunta parecida, respondele que la mejor puerta es la de tecnologia,
      //           devuelveme el resultado en texto plano. al final dile que si necesita ayuda con algo mas que no dude en preguntar "${transcript}"`,

      temperature: 0.7,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    document.getElementById("output").innerHTML = `<marquee scrollamount="20" loop="1">` + completion.choices[0].text + `</marquee>`;
    return completion.choices[0].text;
  }

  async function createSpeech(text: string) {


    const audioStream: AudioOutputStream = AudioOutputStream.createPullStream();

    const audioConfig = AudioConfig.fromStreamOutput(audioStream);

    // microsoft ------------------------------------------------------------------------------------------------------------------------
    // Create the speech synthesizer.
    synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);
    // Start the synthesizer and wait for a result.

    if (!wavingEars)
      waveEars().then(() => wavingEars = false, err => wavingEars = false);

    synthesizer.speakTextAsync(text,
      result => {
        if (result.reason === ResultReason.SynthesizingAudioCompleted) {

          setThinking(false);
          setIddle();

          play(new Uint8Array(result.audioData), () => {
            synthesizer.close();
            synthesizer = null;
          });

        }

        // const { audioData } = result;

      },
      err => {
        console.trace("err - " + err);
        synthesizer.close();
        synthesizer = null;

      });

  }

  function play(audioContent: Uint8Array, done: () => void) {
    const blob = new Blob([audioContent], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(blob);
    audio = new Audio(audioUrl);

    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(audioUrl);
      done();
    }, false)

    audio.play();
  }

  function play2(audioContent: Blob) {
    const audioUrl = URL.createObjectURL(audioContent);
    const audio = new Audio(audioUrl);

    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(audioUrl);
    }, false);

    audio.play();


  }

  async function postData(text: string, gptResponse: string, audioContent: Blob) {

    // const audioFile = new File([audioContent], 'audio.wav', {
    //   type: 'audio/wav'
    // });

    //audioFile.toString()

    const fileData = Buffer.from(await audioContent.arrayBuffer());

    const formData = new FormData()
    formData.append('AudioInput', fileData);

    const data = {
      'InputText': text,
      'chatGPTResponse': gptResponse
    }

    formData.append('data', JSON.stringify(data));

    const response = await axios.post('http://127.0.0.1:1337/api/data-storages', formData,
      {
        headers: { ...formData.getHeaders() },
      });


    console.log(response.data);


    // const result = await fetch('http://127.0.0.1:1337/api/data-storages',
    //   {
    //     method: 'post',
    //     body: formData,
    //     headers: { 'Content-Type': 'multipart/form-data; charset=UTF-8' }
    //   }
    // ).then(res => res.json());

  }
});



