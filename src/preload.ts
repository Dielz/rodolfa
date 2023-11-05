import { OpenAI } from "openai";
//import { TextToSpeechClient } from "@google-cloud/text-to-speech";
//import { google } from "@google-cloud/text-to-speech/build/protos/protos";
import { ResultReason, SpeechConfig, SpeechSynthesizer } from "microsoft-cognitiveservices-speech-sdk";
import * as path from "path";
//import * as fs from "fs";
//import * as util from "util";
//import * as readline from "readline";

window.addEventListener("DOMContentLoaded", () => {

  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

  const speechConfig = SpeechConfig.fromSubscription(process.env.SPEECH_KEY, process.env.SPEECH_REGION);
  speechConfig.speechRecognitionLanguage = "es-DO";

  speechConfig.speechSynthesisVoiceName = "es-DO-RamonaNeural";

  const openaiApi = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
    dangerouslyAllowBrowser: true,
  });

  //const gtts = new TextToSpeechClient();

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
     que todas tus respuestas estan orientada hacia la navidad y en caso de no poder orientarla a la navidad o 
     un tema relacionado a la navidad, responde con "No puedo responder nada fuera de la navidad, pero si te 
     puedo dar un dato navideño" y procedes a dar un dato sobre la navidad o un chiste navideño muy gracioso y utiliza gerga dominicana. "${transcript.text}"`,
      temperature: 0.7,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    document.getElementById("output").innerHTML = completion.choices[0].text;
    // // Google ------------------------------------------------------------------------------------------------------------------------
    // const request = {
    //   audioConfig: {
    //     audioEncoding: google.cloud.texttospeech.v1.AudioEncoding.MP3,
    //     effectsProfileId: ["headphone-class-device"],
    //     pitch: 0,
    //     speakingRate: 1,
    //   },
    //   input: { text: completion.choices[0].text },
    //   voice: {
    //     languageCode: "es-US",
    //     name: "es-US-Studio-B",
    //   },
    // };

    // // Performs the text-to-speech request
    // const response: any = await gtts.synthesizeSpeech(request);
    // console.log(response);


    // microsoft ------------------------------------------------------------------------------------------------------------------------
    // Create the speech synthesizer.
    var synthesizer = new SpeechSynthesizer(speechConfig);
    // Start the synthesizer and wait for a result.
    const response: any = synthesizer.speakTextAsync(completion.choices[0].text,
      function (result) {
        if (result.reason === ResultReason.SynthesizingAudioCompleted) {
          console.log("synthesis finished.");
        } else {
          console.error("Speech synthesis canceled, " + result.errorDetails +
            "\nDid you set the speech resource key and region values?");
        }
        synthesizer.close();
        synthesizer = null;
      },
      function (err) {
        console.trace("err - " + err);
        synthesizer.close();
        synthesizer = null;
      });
    play(response);
  }

  // Reproducir el audio sintetizado
  function play(audioContent: Uint8Array) {
    const blob = new Blob([audioContent], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.play();
  }


});
