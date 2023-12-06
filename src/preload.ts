import { OpenAI } from "openai";
//import { TextToSpeechClient } from "@google-cloud/text-to-speech";
//import { google } from "@google-cloud/text-to-speech/build/protos/protos";
import { AudioConfig, CancellationDetails, CancellationReason, NoMatchDetails, ResultReason, SpeechConfig, SpeechRecognizer, SpeechSynthesizer } from "microsoft-cognitiveservices-speech-sdk";
import * as path from "path";
import * as FormData from 'form-data';
import fetch, { FetchError } from 'node-fetch';
import axios, {
  AxiosError, AxiosHeaders
} from 'axios';

//import * as util from "util";
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:1337';

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
  let clicked: Boolean = false;

  const recordButton = document.getElementById("recordButton") as HTMLButtonElement;
  const timer = document.getElementById("timer") as HTMLButtonElement;

  recordButton.addEventListener("mousedown", start);
  recordButton.addEventListener("mouseup", stop);
  recordButton.addEventListener("mouseleave", stop);

  function start() {

    timer.style.display = 'block';
    setTimeout(function () { 

      timer.style.display = 'none';

    }, 3500);

    // clicked = true;
    // startRecording();

  }

  function stop() {
    timer.style.display = 'none';
    if (clicked) {
      clicked = false;
      transcribeText();
    }
  }

  function startRecording() {
    const constraints: MediaStreamConstraints = { audio: true, video: false };

    navigator.mediaDevices.getUserMedia(constraints)
      .then(function (stream) {
        audioStream = stream;
        rec = new MediaRecorder(stream);
        rec.start();

        document.getElementById("output").innerHTML = "Recording started...";
      })
      .catch(function (err) {
        console.log(err);
      });
  }

  function transcribeText() {
    document.getElementById("output").innerHTML = "Converting audio to text...";

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

    // Obtén los datos de audio del Blob
    //let arrayBuffer = new Uint8Array(await blob.arrayBuffer());
    // // Asegurémonos de que la longitud sea múltiplo de 4
    // const dataView = new DataView(arrayBuffer);
    // const originalLength = dataView.byteLength;
    // const padding = 4 - (originalLength % 4);
    // if (padding !== 4) {
    //   const paddedArrayBuffer = new ArrayBuffer(originalLength + padding);
    //   const paddedDataView = new DataView(paddedArrayBuffer);
    //   for (let i = 0; i < originalLength; i++) {
    //     paddedDataView.setUint8(i, dataView.getUint8(i));
    //   }
    //   arrayBuffer = paddedArrayBuffer;
    //

    // const audioData: AudioData = {
    //   sampleRate: 44100,
    //   channelData: [new Float32Array(arrayBuffer)],
    // };

    // // Agrega un encabezado WAV
    // let wavData = null;
    // await encode(audioData).then((buffer) => {
    //   wavData = buffer;
    // });

    // let wav = new WaveFile(arrayBuffer);


    // const wavBlob = new Blob([wavData], { type: 'audio/wav' });
    // play2(wavBlob);
    // // Microsoft ---------------------------------------------------------------------------------------------------------------------
    // let audioConfig = AudioConfig.fromWavFileInput(new File([blob], 'audio.wav'));
    // let speechRecognizer = new SpeechRecognizer(speechConfig, audioConfig);

    // let transcript = "Hola";

    // speechRecognizer.recognizeOnceAsync(result => {
    //   switch (result.reason) {
    //     case ResultReason.RecognizedSpeech:
    //       console.log(`RECOGNIZED: Text=${result.text}`);
    //       break;
    //     case ResultReason.NoMatch:
    //       const details = NoMatchDetails.fromResult(result);
    //       console.log(`CANCELED: Reason=${details.reason}`);
    //       console.log("NOMATCH: Speech could not be recognized.");
    //       break;
    //     case ResultReason.Canceled:
    //       const cancellation = CancellationDetails.fromResult(result);
    //       console.log(`CANCELED: Reason=${cancellation.reason}`);

    //       if (cancellation.reason == CancellationReason.Error) {
    //         console.log(`CANCELED: ErrorCode=${cancellation.ErrorCode}`);
    //         console.log(`CANCELED: ErrorDetails=${cancellation.errorDetails}`);
    //         console.log("CANCELED: Did you set the speech resource key and region values?");
    //       }
    //       break;
    //   }
    //   speechRecognizer.close();

    // }, (err) => {

    //   console.log(err);
    // });

    // document.getElementById("question").innerHTML = transcript;
    // return transcript;

    // OpenAi ------------------------------------------------------------------------------------------------------------------------
    const transcriptG = await openaiApi.audio.transcriptions.create({
      model: 'whisper-1',
      file: new File([blob], 'audio.wav'),
    });

    let transcript = transcriptG.text;
    document.getElementById("question").innerHTML = transcript;
    return transcript;

  }

  async function answerQuestion(transcript: string) {

    // OpenAi ------------------------------------------------------------------------------------------------------------------------
    const completion = await openaiApi.completions.create({
      model: 'gpt-3.5-turbo-instruct',
      // prompt: `Que tu respuesta sea breve y corta y evita usar códigos o caracteres ilegibles o iconos, que todas tus respuestas estén orientadas a la navidad y en caso de no poder orientarla a la navidad o un tema relacionado a la navidad, responde con "No puedo responder temas no relacionados con la navidad, pero sí te puedo dar un dato navideño" y procedes a dar un dato sobre la navidad.  "${transcript}"`,
      prompt: `Que tu respuesta sea breve y corta y responder solo preguntas relacionadas con la época navideña. En caso de recibir una pregunta no relacionada, indicar amablemente que no se está autorizado a hablar sobre temas que no estén relacionados con la Navidad y, a continuación, proporcionar un dato interesante sobre la Navidad. "${transcript}"`,
      temperature: 0.7,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    document.getElementById("output").innerHTML = completion.choices[0].text;
    return completion.choices[0].text;
  }

  async function createSpeech(text: string) {
    // microsoft ------------------------------------------------------------------------------------------------------------------------
    // Create the speech synthesizer.
    var synthesizer = new SpeechSynthesizer(speechConfig);
    // Start the synthesizer and wait for a result.
    let g = await synthesizer.speakTextAsync(text,
      result => {

        const { audioData } = result;
        synthesizer.close();
        synthesizer = null;
        //  play(new Uint8Array(audioData));
      },
      err => {
        console.trace("err - " + err);
        synthesizer.close();
        synthesizer = null;

      });

  }

  function play(audioContent: Uint8Array) {
    const blob = new Blob([audioContent], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.play();
  }

  function play2(audioContent: Blob) {
    const audioUrl = URL.createObjectURL(audioContent);
    const audio = new Audio(audioUrl);
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
