window.AudioLib = (function () {

    class AudioLib {

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
            this._buffer = null;
            this._resEncoder = {};
        }

        static _generateUUID () {
            return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        }

        static _hasAudio() {
            if (!navigator.mediaDevices) return Promise.resolve(false);
            
            return navigator.mediaDevices.enumerateDevices()
                    .then(devices => devices.some(device => device.kind === 'audioinput'))
                    .catch(() => false);
        }

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
         */
        static _acaoBuffer (dataObj) {
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

            this._resEncoder = {
                blob: this._blobM,
                url: url
            }
           
        }

        /**
         * 
         * @param {Object} blob 
         * @param {String} mimeType
         */

        acaoEncoder (file, mimeType) {

            console.log(file, "olha ai")

            this._encodeMimeType = mimeType;

            const regUrl = /[http|https]:\/\/(.*)/g;    

            if (!(file instanceof Blob || 
                  regUrl.test(file) ||
                  file instanceof Element)) {
                //
                AudioLib._errorMessage('Error', 'O formato inserido não é valido...');
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
            this._recorder.ondataavailable = AudioLib._acaoBuffer.bind(this);
            // COMEÇA A GRAVAÇÃO
            this._recorder.start();
        }

        static _recordCondition () {
            // PARA DE GRAVAR
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

        get isRecording () {
            return this._recorder.state === 'recording';
        }

        gravacao () {
            // TEM DEVICES
            AudioLib._hasAudio()
                .then(AudioLib._recordCondition.bind(this))
                .catch(AudioLib._errorMessage.bind({
                    name: 'Não encontrou dispositivos de audio',
                    message: 'Por favor, veja se o seu dispositivo de audio está funcionando normalmente'
                }))
            
        }

        addButton () {

            this._recordButton = document.getElementById(this._idButton);

            if (!document.getElementById(this._idButton)) {
                this._errorMessage('Não foi escolhido o id do botão ou o mesmo é inesxistente...', 'Procure criar o objeto com um id para html válido!')
            }
            this._recordButton.addEventListener("click", this.gravacao.bind(this));
           
        }

        /**
         * 
         * @param {Object} error 
         */

        static _errorMessage (error) {
            throw new Error(`${error.name} : \n ${error.message}`);
        }


    }

    return AudioLib;

})();


