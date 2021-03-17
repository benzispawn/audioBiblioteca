window.AudioBiblioteca = (function () {

    class AudioBiblioteca {

        constructor ({
                        idBotao = 'recordButton', 
                        downloadAuto = false, 
                        mimeType = 'audio/ogg; codecs=opus',
                        sampleRate = 20000, 
                        sampleSize = 16,
                        channel = 1
                    } = {}) {
            
            this._idBotao = idBotao;
            this._downloadAuto = downloadAuto;
            this._recorder = null;
            this._gumStream = null;
            this._recordButton = null;
            this._blobM = null;
            this._devices = [];
            this._mimeType = mimeType;
            this._sampleRate = sampleRate;
            this._sampleSize = sampleSize;
            this._channel = channel;
            this._buffer = null;
        }

        static _hasAudio() {
            if (!navigator.mediaDevices) return Promise.resolve(false);
            
            return navigator.mediaDevices.enumerateDevices()
                    .then(devices => devices.some(device => device.kind === 'audioinput'))
                    .catch(() => false);
        }

        downloadArquivo = (function () {
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

                this.blobM = new Blob([buffer], {type: this._mimeType});

                // PROCESSO NORMAL PARA ALOCAR O AUDIO NA TELA -- TEMPORÁRIO
                var url = URL.createObjectURL(this.blobM);
                var preview = document.createElement('audio');
                preview.controls = true;
                console.log(url,"url de resultado")
                preview.src = url;
                document.body.appendChild(preview);
                if (this._downloadAuto) {
                    this.downloadArquivo(url);
                }

            }

            dataObj.data.arrayBuffer()
                .then(bufferInterno.bind(this))

            
        }

        /**
         * 
         * @param {String} url 
         */

        static chamadaURLToBlob (url) {

            const alocaPosChamada = function (b) {
                this._blobM = b;
            }

            const chamadaPreparo = function (data) {
                console.log(data, "data dentro da chamadaPreparo")
                data.blob(alocaPosChamada.bind(this));
            }

            fetch(url)
                .then(chamadaPreparo.bind(this))
                .catch(AudioBiblioteca.errorMensagem.bind(error.name, error.message));
        }

        /**
         * 
         * @param {Object} blob 
         * @param {String} mimeType
         */

        acaoEncoder (file, mimeType) {

            const regUrl = /[http|https]:\/\/(.*)/g;            
            console.log(file, "primeiro a chegar")
            // CREATE BLOB FOR URL
            if (regUrl.test(file)) {
                console.log('dentro do if de url')
                AudioBiblioteca.chamadaURLToBlob(file);
            }

            // CHECK IF IT'S A INSTANCE OF BLOB
            if (file instanceof Blob) {
                file.arrayBuffer()
                    .then((buffer) => {
                        this.blobM = new Blob([buffer], {type: mimeType});
                        var url = URL.createObjectURL(this.blobM);
    
                        if (this._downloadAuto) {
                            this.downloadArquivo(url);
                        }
    
                        return {
                            blob: this._blobM,
                            url: url
                        }
                    })
                    .catch(AudioBiblioteca.errorMensagem.bind(error.name, error.message));
            }

            if (file instanceof Element) {
                const url = file.src;

                if (url) {
                    console.log(url);
                }
            }
        }

        /**
         * 
         * @param {Object} stream 
         */

        static _acaoGravacao (stream) {
            // MIMES ACEITOS
            // const mime = ['audio/wav', 'audio/mpeg-3', 'audio/webm', 'audio/ogg; codecs=opus']
            //     .filter(MediaRecorder.isTypeSupported);
            // console.log("mime aceitos", mime);
            this._gumStream = stream;
            this._recorder = new MediaRecorder(stream);
            console.log("stream recorder", this._recorder)
            // TRABALHO COM BUFFER PARA TROCAR O TYPE
            this._recorder.ondataavailable = AudioBiblioteca._acaoBuffer.bind(this);
            // COMEÇA A GRAVAÇÃO
            this._recorder.start();
        }

        static _condicaoGravacao () {
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
                }).then(AudioBiblioteca._acaoGravacao.bind(this))
                  .catch(AudioBiblioteca.errorMensagem.bind(this));
            }
        }

        gravacao () {
            // TEM DEVICES
            AudioBiblioteca._hasAudio()
                .then(AudioBiblioteca._condicaoGravacao.bind(this))
                .catch(AudioBiblioteca.errorMensagem.bind({
                    name: 'Não encontrou dispositivos de audio',
                    message: 'Por favor, veja se o seu dispositivo de audio está funcionando normalmente'
                }))
            
        }

        addAcaoBotao () {

            this._recordButton = document.getElementById(this._idBotao);

            if (!document.getElementById(this._idBotao)) {
                this.errorMensagem('Não foi escolhido o id do botão ou o mesmo é inesxistente...', 'Procure criar o objeto com um id para html válido!')
            }
            this._recordButton.addEventListener("click", this.gravacao.bind(this));
           
        }

        static errorMensagem (error) {
            throw new Error(`${error.name} : \n ${error.message}`);
        }


    }

    return AudioBiblioteca;

})();


