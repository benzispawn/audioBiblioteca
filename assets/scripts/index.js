window.AudioLib = (function () {

    class AudioLib {

        /**
         * 
         * 
         * 
         * Here you can change some params as:
         *      @param {Number} sampleRate -> as default 20Hz
         *      @param {Number} sampleSize -> as default 16 bits
         *      @param {String} idButton -> as default recordButton but you can change for an id of you taste
         *      @param {Number} channel -> default 1
         *      @param {String} mimeType -> default as .ogg but you can change to other formats
         *      @param {Boolean} downloadAuto -> with you want to download automaticaly, default is false
         *      @var {Object} _recorder -> here we have the object with the values of the record
         *      @var {Object} _blobM -> The result blob
         *      @var {Object} _gumStream ->Your generated stream
         *      @var {String} _encodeMimeType -> mimeType for use in the @function changeType
         *      @var {Object} _resChangedType -> Object generated in the @function changeType
         */

        constructor ({
                        idButton = 'recordButton', 
                        downloadAuto = false, 
                        mimeType = 'audio/ogg; codecs=opus',
                        sampleRate = 20000, 
                        sampleSize = 16,
                        channel = 1
                    } = {}) {
            
            this._idButton = idButton;
            this._downloadAuto = downloadAuto;
            this._recorder = null;
            this._gumStream = null;
            this._recordButton = null;
            this._blobM = null;
            this._devices = [];
            this._mimeType = mimeType;
            this._encodeMimeType = mimeType;
            this._sampleRate = sampleRate;
            this._sampleSize = sampleSize;
            this._channel = channel;
            this._resChangedType = {};
        }
        /**
         * @function _generateUUID
         * @returns 
         * To generate a UUID for the name of files
         */
        static _generateUUID () {
            return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        }
        // Has any audio here???
        static _hasAudio() {
            if (!navigator.mediaDevices) return Promise.resolve(false);
            
            return navigator.mediaDevices.enumerateDevices()
                    .then(devices => devices.some(device => device.kind === 'audioinput'))
                    .catch(() => false);
        }

        /**
         * Download a file automaticaly as the record finishes
         */

        downloadFile = (function () {
            let a = document.createElement('a');
            document.body.appendChild(a);
            a.style = 'display: none;'
            
            return function (url, nomeArquivo = 'audio.mp3') {
                a.href = url;
                a.download = nomeArquivo;
                a.click();
                window.URL.revokeObjectURL(url);
            }
        })()
        /**
         * 
         * @param {Object} buffer 
         * 
         * Same as _bufferAction, maybe delete in a near future
         */
        static _actionBuffer (dataObj) {
            this._blobM = dataObj.data;
            // FUNÇÃO PARA TRANFORMAR EM OUTRO FORMATO
            function bufferInterno (buffer) {
                console.log(buffer, "buffer")
                console.log(this, "this")
                console.log(this._blobM)

                this._blobM = new Blob([buffer], {type: this._mimeType});
                this._blobM.name = `audio_${AudioLib._generateUUID()}.${this._mimeType.split('/')[1].replace('; codecs=opus', '')}`;
                this._blobM.lastModifiedDate = new Date();

                // PROCESSO NORMAL PARA ALOCAR O AUDIO NA TELA -- TEMPORÁRIO
                var url = URL.createObjectURL(this._blobM);
                var preview = document.createElement('audio');
                preview.controls = true;
                console.log(url,"url de resultado")
                preview.src = url;
                document.body.appendChild(preview);
                if (this._downloadAuto) {
                    this.downloadFile(url, this._blobM.name);
                }

            }

            dataObj.data.arrayBuffer()
                .then(bufferInterno.bind(this))
                .catch(AudioLib._errorMessage);

            
        }

        /**
         * 
         * @param {String} url 
         * 
         * For the use of a Url
         */

        static _fetchURLToBlob (url, _self) {

            const setPostCall = function (b) {
                this._blobM = b;
                b.arrayBuffer()
                    .then(AudioLib._bufferAction.bind(_self))
                    .catch(AudioLib._errorMessage);
            }

            fetch(url)
                .then(res => res.blob())
                .then(setPostCall.bind(_self))
                .catch(AudioLib._errorMessage);
        }
        /**
         * 
         * @param {*} buffer 
         * Receives a buffer to transform into a new one with a different type
         */
        static _bufferAction (buffer) {
            console.log(buffer, "dnetro da bufferAcao")
            console.log(this, "e ai???")
            console.log(this._encodeMimeType, "mime encoder")

            this._blobM = new Blob([buffer], {type: this._encodeMimeType});
            this._blobM.name = `audio_${AudioLib._generateUUID()}.${this._encodeMimeType.split('/')[1].replace('; codecs=opus', '')}`;
            this._blobM.lastModifiedDate = new Date();
            var url = URL.createObjectURL(this._blobM);

            if (this._downloadAuto) {
                this.downloadFile(url);
            }

            this._resChangedType = {
                blob: this._blobM,
                url: url
            }

        }

        /**
         * 
         * @param {Object} blob 
         * @param {String} mimeType
         * 
         * Extra function to be use in a blob or audio Element or 
         * a url blob to extract a new blob in a new format
         */

        changeType (file, mimeType) {

            console.log(file, "olha ai")

            this._encodeMimeType = mimeType;

            const regUrl = /[http|https]:\/\/(.*)/g;    

            if (!(file instanceof Blob || 
                  regUrl.test(file) ||
                  file instanceof Element)) {
                //
                AudioLib._errorMessage('Error', 'The type are trying to use is invalid...');
            }

                    
            // CREATE BLOB FOR URL
            if (regUrl.test(file)) {
                AudioLib._fetchURLToBlob(file, this);
            }

            // CHECK IF IT'S A INSTANCE OF BLOB
            if (file instanceof Blob) {
                file.arrayBuffer()
                    .then(AudioLib._bufferAction.bind(this))
                    .catch(AudioLib._errorMessage);
            }

            if (file instanceof Element) {
                const url = file.src;

                if (regUrl.test(url)) {
                    console.log(url);
                    AudioLib._fetchURLToBlob(url, this);
                }
            }

        }

        /**
         * 
         * @param {Object} stream 
         * 
         * Pass the stream as parameter than to transform into a buffer and get the blob
         * on the type you want
         */

        static _recordAction (stream) {
            // MIMES ACEITOS
            // const mime = ['audio/wav', 'audio/mpeg-3', 'audio/webm', 'audio/ogg; codecs=opus']
            //     .filter(MediaRecorder.isTypeSupported);
            // console.log("mime aceitos", mime);
            this._gumStream = stream;
            this._recorder = new MediaRecorder(stream);
            console.log("stream recorder", this._recorder)
            // TRABALHO COM BUFFER PARA TROCAR O TYPE
            this._recorder.ondataavailable = AudioLib._actionBuffer.bind(this);
            // EXIT FROM A ERROR
            this._recorder.onerror = AudioLib._errorMessage;
            // COMEÇA A GRAVAÇÃO
            this._recorder.start();
        }
        /**
         * Condition for enable record or stop it
         */
        static _recordCondition () {
            // Good to go
            if (this._recorder && this._recorder.state == "recording") {

                this._recorder.stop();
                //console.log(this._gumStream.getAudioTracks(), "audio tracks");
                this._gumStream.getAudioTracks()[0].stop();

            } else {
                navigator.mediaDevices.getUserMedia({
                    audio: {
                        sampleSize: this._sampleSize,
                        sampleRate: this._sampleRate,
                        channelCount: this._channel,
                    }
                }).then(AudioLib._recordAction.bind(this))
                  .catch(AudioLib._errorMessage.bind(this));
            }
        }
        /**
         * To see if is recording or no
         */
        get isRecording () {
            return this._recorder.state === 'recording';
        }

        /**
         * Start recording the audio
         */
        record () {
            // HAS DEVICES
            AudioLib._hasAudio()
                .then(AudioLib._recordCondition.bind(this))
                .catch(AudioLib._errorMessage.bind({
                    name: 'No devices found',
                    message: 'See if your device is working properly...'
                }))
            
        }

        /**
         * The functio add an event in button of your choice
         */

        addButton () {

            this._recordButton = document.getElementById(this._idButton);

            if (!document.getElementById(this._idButton)) {
                this._errorMessage('Element is inexistent', 'Change the id of your element or see if exists.')
            }
            this._recordButton.addEventListener("click", this.record.bind(this));
           
        }

        /**
         * 
         * @param {Object} error 
         * 
         * Return a error message in the console
         */

        static _errorMessage (error) {
            throw new Error(`${error.name} : \n ${error.message}`);
        }


    }

    return AudioLib;

})();



/**
const waveEncoder = () => {
    let BYTES_PER_SAMPLE = 2
  
    let recorded = []
  
    function encode (buffer) {
      let length = buffer.length
      let data = new Uint8Array(length * BYTES_PER_SAMPLE)
      for (let i = 0; i < length; i++) {
        let index = i * BYTES_PER_SAMPLE
        let sample = buffer[i]
        if (sample > 1) {
          sample = 1
        } else if (sample < -1) {
          sample = -1
        }
        sample = sample * 32768
        data[index] = sample
        data[index + 1] = sample >> 8
      }
      recorded.push(data)
    }
  
    function dump (sampleRate) {
      let bufferLength = recorded.length ? recorded[0].length : 0
      let length = recorded.length * bufferLength
      let wav = new Uint8Array(44 + length)
      let view = new DataView(wav.buffer)
  
      // RIFF identifier 'RIFF'
      view.setUint32(0, 1380533830, false)
      // file length minus RIFF identifier length and file description length
      view.setUint32(4, 36 + length, true)
      // RIFF type 'WAVE'
      view.setUint32(8, 1463899717, false)
      // format chunk identifier 'fmt '
      view.setUint32(12, 1718449184, false)
      // format chunk length
      view.setUint32(16, 16, true)
      // sample format (raw)
      view.setUint16(20, 1, true)
      // channel count
      view.setUint16(22, 1, true)
      // sample rate
      view.setUint32(24, sampleRate, true)
      // byte rate (sample rate * block align)
      view.setUint32(28, sampleRate * BYTES_PER_SAMPLE, true)
      // block align (channel count * bytes per sample)
      view.setUint16(32, BYTES_PER_SAMPLE, true)
      // bits per sample
      view.setUint16(34, 8 * BYTES_PER_SAMPLE, true)
      // data chunk identifier 'data'
      view.setUint32(36, 1684108385, false)
      // data chunk length
      view.setUint32(40, length, true)
  
      // eslint-disable-next-line unicorn/no-for-loop
      for (let i = 0; i < recorded.length; i++) {
        wav.set(recorded[i], i * bufferLength + 44)
      }
  
      recorded = []
      postMessage(wav.buffer, [wav.buffer])
    }
  
    onmessage = e => {
      if (e.data[0] === 'encode') {
        encode(e.data[1])
      } else if (e.data[0] === 'dump') {
        dump(e.data[1])
      }
    }
  }
  
 * 
 * 
 */

 