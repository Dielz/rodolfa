import { OpenAI } from "openai";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { google } from "@google-cloud/text-to-speech/build/protos/protos";
import * as path from "path";
import * as fs from "fs";
import * as util from "util";


require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const openaiApi = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
  dangerouslyAllowBrowser: true,
});

const gtts = new TextToSpeechClient();

let rec: MediaRecorder | null = null;
let audioStream: MediaStream | null = null;

const recordButton = document.getElementById("recordButton") as HTMLButtonElement;
const transcribeButton = document.getElementById("transcribeButton") as HTMLButtonElement;

recordButton.addEventListener("click", startRecording);
transcribeButton.addEventListener("click", transcribeText);

function startRecording() {
  const constraints: MediaStreamConstraints = { audio: true, video: false };

  recordButton.disabled = true;
  transcribeButton.disabled = false;

  navigator.mediaDevices.getUserMedia(constraints)
    .then(function (stream) {
      const audioContext = new AudioContext();
      audioStream = stream;
      const input = audioContext.createMediaStreamSource(stream);
      rec = new MediaRecorder(stream);
      rec.start();

      document.getElementById("output").innerHTML = "Recording started...";
    })
    .catch(function (err) {
      recordButton.disabled = false;
      transcribeButton.disabled = true;
    });
}

function transcribeText() {
  document.getElementById("output").innerHTML = "Converting audio to text...";
  transcribeButton.disabled = true;
  recordButton.disabled = false;

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
      uploadSoundData(blob);
    };
  }
}

function uploadSoundData(blob: Blob) {
  transcript(blob);
}

async function transcript(blob: Blob) {
  const transcript = await openaiApi.audio.transcriptions.create({
    model: 'whisper-1',
    file: new File([blob], 'audio.wav'),
  });

  document.getElementById("question").innerHTML = transcript.text;

  const completion = await openaiApi.completions.create({
    model: 'gpt-3.5-turbo-instruct',
    prompt: `Que tu respuesta sea breve y corta y nada de código o caracteres ilegibles y
     solo responde preguntas relacionadas a la navidad, en caso de no ser una pregunta o 
     un tema relacionado a la navidad, responde con "No estoy autorizado a responder temas 
     fuera de la navidad, pero aquí te dejo un chiste navideño" y procedes a dar un chiste navideño. "${transcript.text}"`,
    temperature: 0.7,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  document.getElementById("output").innerHTML = completion.choices[0].text;

  const request = {
    audioConfig: {
      audioEncoding: google.cloud.texttospeech.v1.AudioEncoding.LINEAR16,
      effectsProfileId: ["headphone-class-device"],
      pitch: 0,
      speakingRate: 1,
    },
    input: { text: completion.choices[0].text },
    voice: {
      languageCode: "es-US",
      name: "es-US-Studio-B",
    },
  };

  // Performs the text-to-speech request
  const response: any = await gtts.synthesizeSpeech(request);

  play(response.audioContent);
}

// Reproducir el audio sintetizado
function play(audioContent: Uint8Array) {
  const blob = new Blob([audioContent], { type: 'audio/mp3' });
  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);
  audio.play();
}
