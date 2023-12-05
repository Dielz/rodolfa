import { OpenAI } from "openai";
//import { TextToSpeechClient } from "@google-cloud/text-to-speech";
//import { google } from "@google-cloud/text-to-speech/build/protos/protos";
import { AudioConfig, CancellationDetails, CancellationReason, NoMatchDetails, ResultReason, SpeechConfig, SpeechRecognizer, SpeechSynthesizer } from "microsoft-cognitiveservices-speech-sdk";
import * as path from "path";
//import { readFileSync, writeFileSync } from 'fs';
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
  let clicked: Boolean = false;
  let firstTimer: string | number | NodeJS.Timeout;


  openModal();

  const recordButton = document.getElementById("recordButton") as HTMLButtonElement;  
  // recordButton.innerHTML = '<i class="fa fa-solid fa-microphone"></i> Grabar audio';

  recordButton.addEventListener("mousedown", start);
  recordButton.addEventListener("mouseup", stop);
  recordButton.addEventListener("mouseleave", stop);

  // Llama a la función start directamente al cargar la página
  function openModal() {
    document.getElementById("startModal").style.display = "block";
    // start();
    firstTimer = setTimeout(() => {
      closeModal();
    }, 3000);
  };

  function start() {
    clicked=true;
    startRecording();
  }

  function closeModal() {
    // Cierra el modal
    document.getElementById("startModal").style.display = "none";
    firstTimer = setTimeout(() => {
      openModal();
    },75000)

  }

  // Limpiar los temporizadores al cerrar o recargar la página
  window.addEventListener("beforeunload", () => {
    clearTimeout(firstTimer);
  });



  function stop() {
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
        // Agregar clase "recording" al contenedor de los ojos
        // document.querySelector('.eyes-container').classList.add('recording');
        rec.start();
        document.getElementById("output").innerHTML = ` <i class="fas fa-microphone"></i>  Recording started...`;
    
      })
      .catch(function (err) {
        console.log(err);
      });
  }

  function transcribeText() {
    document.getElementById("output").innerHTML = `<i class="fas fa-regular fa-headphones"></i>  Converting audio to text...`;

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
    createSpeech(text);

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

    // Abre los ojos después de la transcripción
    return transcript;

  }

  async function answerQuestion(transcript: string) {

    // OpenAi ------------------------------------------------------------------------------------------------------------------------
    const completion = await openaiApi.completions.create({
      model: 'gpt-3.5-turbo-instruct',
     // prompt: `Que tu respuesta sea breve y corta y evita usar códigos o caracteres ilegibles o iconos, que todas tus respuestas estén orientadas a la navidad y en caso de no poder orientarla a la navidad o un tema relacionado a la navidad, responde con "No puedo responder temas no relacionados con la navidad, pero sí te puedo dar un dato navideño" y procedes a dar un dato sobre la navidad.  "${transcript}"`,
      prompt: `Actua como un experto en temas navideños, quiero que tu respuesta sea breve y corta, tu vas a responder solo preguntas relacionadas con la época navideña, en caso de no tener una repuesta, orienta tu repuesta con una tematica navideña explicando amablemente que solo sabes hablar sobre temas relacionados a la epoca navideña y en el proceso proporcionar un dato interesante sobre la Navidad, devuelveme el resultado en texto plano.  "${transcript}"`,
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
    synthesizer.speakTextAsync(text,
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

    // // Google ------------------------------------------------------------------------------------------------------------------------
    // const request = {
    //   audioConfig: {
    //     audioEncoding: google.cloud.texttospeech.v1.AudioEncoding.MP3,
    //     effectsProfileId: ["headphone-class-device"],
    //     pitch: 0,
    //     speakingRate: 1,
    //   },
    //   input: { text: text },
    //   voice: {
    //     languageCode: "es-US",
    //     name: "es-US-Studio-B",
    //   },
    // };

    // // Performs the text-to-speech request
    // const response: any = await gtts.synthesizeSpeech(request);
    // console.log(response);
    // play(response);

  }

  // function play(audioContent: Uint8Array) {
  //   const blob = new Blob([audioContent], { type: 'audio/mp3' });
  //   const audioUrl = URL.createObjectURL(blob);
  //   const audio = new Audio(audioUrl);
  //   audio.play();
  // }

  function play2(audioContent: Blob) {
    const audioUrl = URL.createObjectURL(audioContent);
    const audio = new Audio(audioUrl);
    audio.play();
  }

});



