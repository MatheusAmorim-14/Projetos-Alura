// SEÇÃO DE BUSCA DE ARTISTAS
const searchInput = document.getElementById('search-input');
const resultArtist = document.getElementById("result-artist");
const resultPlaylist = document.getElementById('result-playlists');

function requestApi(searchTerm) {
    const url = `http://localhost:3000/artists?name_like=${searchTerm}`;
    fetch(url)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Erro na API: ${response.statusText}`);
            }
            return response.json();
        })
        .then((result) => displayResults(result))
        .catch(error => {
            console.error('Falha ao buscar artistas:', error);
            resultArtist.classList.add('hidden'); // Esconde a seção de artista em caso de erro
            // Poderia exibir uma mensagem de erro para o usuário aqui
        });
}

function displayResults(results) { // Renomeado para 'results' para indicar que pode ser uma lista
    if (!resultArtist || !resultPlaylist) {
        console.error("Elementos resultArtist ou resultPlaylist não encontrados.");
        return;
    }

    resultPlaylist.classList.add("hidden"); // Sempre esconde playlists ao exibir resultados de artista

    const artistNameElement = document.getElementById('artist-name');
    const artistImageElement = document.getElementById('artist-img');

    if (!artistNameElement || !artistImageElement) {
        console.error("Elementos artist-name ou artist-img não encontrados.");
        resultArtist.classList.add("hidden"); // Esconde se os sub-elementos não existem
        return;
    }

    if (Array.isArray(results) && results.length > 0) {
        // Por enquanto, exibe apenas o primeiro artista.
        // Para exibir todos, você precisaria criar elementos dinamicamente para cada artista.
        const artist = results[0];
        artistNameElement.innerText = artist.name;
        artistImageElement.src = artist.urlImg; // Verifique se a propriedade é 'urlImg' ou similar
        resultArtist.classList.remove('hidden');
    } else if (!Array.isArray(results) && results) { // Se for um único objeto (improvável com name_like)
        artistNameElement.innerText = results.name;
        artistImageElement.src = results.urlImg;
        resultArtist.classList.remove('hidden');
    } else {
        // Nenhum resultado encontrado
        artistNameElement.innerText = "Nenhum artista encontrado";
        artistImageElement.src = ""; // Limpa a imagem
        // resultArtist.classList.add('hidden'); // Ou mantenha visível com a mensagem "Nenhum artista encontrado"
        // Para consistência, se não há artista, a seção de artista é escondida.
        // Se quiser mostrar "Nenhum artista encontrado", remova a linha abaixo e ajuste o CSS.
        resultArtist.classList.add('hidden');
        // E mostre as playlists novamente (ou o estado padrão)
        resultPlaylist.classList.remove('hidden');

    }
}

if (searchInput) {
    searchInput.addEventListener('input', function () {
        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm === '') {
            // Quando a busca está vazia, esconde os resultados do artista e mostra as playlists
            if (resultArtist) resultArtist.classList.add('hidden');
            if (resultPlaylist) resultPlaylist.classList.remove('hidden');

            // Limpar informações do artista anterior
            const artistNameElement = document.getElementById('artist-name');
            const artistImageElement = document.getElementById('artist-img');
            if (artistNameElement) artistNameElement.innerText = '';
            if (artistImageElement) artistImageElement.src = '';
            return;
        }
        requestApi(searchTerm);
    });
} else {
    console.warn("Elemento 'search-input' não encontrado.");
}


// SEÇÃO DE SAUDAÇÃO
const greetingElement = document.getElementById("greeting");
if (greetingElement) {
    const currentHour = new Date().getHours();
    const greetingMessage =
        currentHour >= 5 && currentHour < 12
            ? "Bom dia, seja bem vindo"
            : currentHour >= 12 && currentHour < 18
                ? "Boa tarde, seja bem vindo"
                : "Boa noite, seja bem vindo";
    greetingElement.textContent = greetingMessage;
} else {
    console.warn("Elemento 'greeting' não encontrado.");
}

// SEÇÃO GRID INTELIGENTE
const gridContainer = document.querySelector(".offer__list-item"); // Renomeado para clareza

if (gridContainer) {
    const observer = new ResizeObserver(() => {
        const containerWidth = gridContainer.offsetWidth;
        const numColumns = Math.floor(containerWidth / 200);
        // Garante que numColumns seja pelo menos 1 para evitar CSS inválido `repeat(0, ...)`
        gridContainer.style.gridTemplateColumns = `repeat(${Math.max(1, numColumns)}, minmax(200px, 1fr))`;
    });
    observer.observe(gridContainer);
} else {
    console.warn("Elemento com classe '.offer__list-item' não encontrado para o Grid Inteligente.");
}


// ======== INÍCIO DO CÓDIGO DO PLAYER DE MÚSICA (VERSÃO MELHORADA) ========
document.addEventListener('DOMContentLoaded', function () {
    const audioPlayer = document.getElementById('audio-player');
    const playButton = document.getElementById('play-button');
    const pauseButton = document.getElementById('pause-button');
    const addMusicButton = document.getElementById('add-music-button');
    const fileInput = document.getElementById('file-input'); // Espera-se: <input type="file" id="file-input" accept="audio/*" multiple style="display:none;">
    const currentSongDisplay = document.getElementById('current-song');
    const playlistSongsElement = document.getElementById('playlist-songs'); // Espera-se: <ul id="playlist-songs"></ul>

    if (!audioPlayer || !playButton || !pauseButton || !addMusicButton || !fileInput || !currentSongDisplay || !playlistSongsElement) {
        console.error("Um ou mais elementos essenciais do player de música não foram encontrados no HTML. Verifique os IDs.");
        return; // Impede a execução do player se elementos críticos faltarem
    }

    let currentSongIndex = 0;
    let songs = []; // Array para guardar objetos de música: { name, path, objectURL (para revogar depois) }
    let currentObjectURL = null; // Para armazenar a URL do objeto atual e revogá-la

    addMusicButton.addEventListener('click', function () {
        fileInput.click(); // Aciona o input de arquivo escondido
    });

    fileInput.addEventListener('change', function (e) {
        const files = e.target.files;
        if (files.length > 0) {
            // Limpa a playlist atual (visual e array de músicas) antes de adicionar novas
            songs = [];
            playlistSongsElement.innerHTML = '';
            if (currentObjectURL) { // Revoga URL anterior se houver
                URL.revokeObjectURL(currentObjectURL);
                currentObjectURL = null;
            }
            audioPlayer.src = ''; // Limpa o src do player

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                // Aceita os tipos de áudio mais comuns
                if (file.type.startsWith('audio/')) { // Ex: 'audio/mpeg', 'audio/wav', 'audio/ogg'
                    const songName = file.name.replace(/\.[^/.]+$/, ""); // Remove a extensão de forma mais robusta
                    const objectURL = URL.createObjectURL(file);
                    songs.push({
                        name: songName,
                        path: objectURL, // O caminho agora é a URL do objeto
                        originalFile: file // Opcional, para referência
                    });

                    const li = document.createElement('li');
                    li.textContent = songName;
                    li.dataset.songIndex = songs.length - 1; // Armazena o índice atual no array 'songs'
                    li.addEventListener('click', function () {
                        playSong(parseInt(this.dataset.songIndex));
                    });
                    playlistSongsElement.appendChild(li);
                } else {
                    console.warn(`Arquivo ${file.name} (${file.type}) não é um tipo de áudio suportado.`);
                }
            }

            if (songs.length > 0) {
                playSong(0); // Toca a primeira música da nova playlist
            } else {
                // Nenhuma música válida foi carregada, atualiza a interface
                currentSongDisplay.textContent = "Nenhuma música carregada";
                playButton.disabled = true;
                pauseButton.disabled = true;
            }
            fileInput.value = null; // Permite selecionar os mesmos arquivos novamente
        }
    });

    function playSong(index) {
        if (index >= 0 && index < songs.length) {
            currentSongIndex = index;
            const song = songs[currentSongIndex];

            // Revoga a URL do objeto anterior antes de criar uma nova para a música atual
            if (currentObjectURL && currentObjectURL !== song.path) { // Evita revogar e recriar a mesma URL
                URL.revokeObjectURL(currentObjectURL);
            }
            // Se o path já é uma object URL, não precisa recriar.
            // A URL do objeto já foi criada quando o arquivo foi adicionado.
            audioPlayer.src = song.path;
            currentObjectURL = song.path; // Guarda a URL atual para possível revogação

            audioPlayer.play()
                .then(() => {
                    currentSongDisplay.textContent = song.name;
                    playButton.disabled = true;
                    pauseButton.disabled = false;
                    updatePlaylistHighlight();
                })
                .catch(error => {
                    console.error("Erro ao tentar tocar a música:", song.name, error);
                    currentSongDisplay.textContent = `Erro ao tocar ${song.name}`;
                    playButton.disabled = false;
                    pauseButton.disabled = true;
                    // Poderia tentar a próxima música ou limpar o player
                });
        } else {
            console.warn(`Índice de música inválido: ${index}. Total de músicas: ${songs.length}`);
            // Reseta o player se o índice for inválido e não houver músicas
            if (songs.length === 0) {
                audioPlayer.src = "";
                currentSongDisplay.textContent = "Nenhuma música carregada";
                playButton.disabled = true;
                pauseButton.disabled = true;
                if (currentObjectURL) {
                    URL.revokeObjectURL(currentObjectURL);
                    currentObjectURL = null;
                }
            }
        }
    }

    function updatePlaylistHighlight() {
        const items = playlistSongsElement.getElementsByTagName('li');
        for (let i = 0; i < items.length; i++) {
            items[i].classList.remove('active');
            if (i === currentSongIndex) {
                items[i].classList.add('active');
            }
        }
    }

    audioPlayer.addEventListener('ended', function () {
        playNextSong();
    });

    function playNextSong() {
        if (songs.length === 0) {
            currentSongDisplay.textContent = "Playlist vazia";
            playButton.disabled = true;
            pauseButton.disabled = true;
            return;
        }
        const nextIndex = (currentSongIndex + 1) % songs.length; // Loop para o início da playlist
        playSong(nextIndex);
    }

    playButton.addEventListener('click', function () {
        if (songs.length > 0 && audioPlayer.src && audioPlayer.paused) {
            audioPlayer.play()
                .then(() => {
                    playButton.disabled = true;
                    pauseButton.disabled = false;
                })
                .catch(error => console.error("Erro ao dar play:", error));
        } else if (songs.length > 0 && !audioPlayer.src) {
            // Se não há src, mas há músicas, tenta tocar a música atual (ou a primeira)
            playSong(currentSongIndex);
        } else if (songs.length === 0) {
            alert("Nenhuma música na playlist. Adicione músicas primeiro clicando no botão (+).");
        }
    });

    pauseButton.addEventListener('click', function () {
        if (!audioPlayer.paused) {
            audioPlayer.pause();
            playButton.disabled = false;
            pauseButton.disabled = true;
        }
    });

    // Estado inicial do player
    if (songs.length === 0) {
        playButton.disabled = true;
        pauseButton.disabled = true;
        currentSongDisplay.textContent = "Nenhuma música carregada";
    }

    // Limpeza: revogar URLs de objeto ao descarregar a página
    window.addEventListener('beforeunload', () => {
        if (currentObjectURL) {
            URL.revokeObjectURL(currentObjectURL);
        }
        // Se `songs` ainda tiver URLs de objeto não revogadas (ex: se a playlist foi limpa sem tocar todas)
        songs.forEach(song => {
            if (song.path && song.path.startsWith('blob:')) {
                URL.revokeObjectURL(song.path);
            }
        });
    });
});
// ======== FIM DO CÓDIGO DO PLAYER DE MÚSICA ========


/*
// CÓDIGO DO PLAYER DE MÚSICA ANTIGO/SIMPLIFICADO (REMOVIDO OU COMENTADO PARA EVITAR CONFLITOS)
// Se você precisar desta funcionalidade separadamente, ela precisaria ser cuidadosamente integrada
// ou usada em um contexto onde não entre em conflito com o player acima.

// const audioPlayer = document.getElementById('audio-player');
// const playButton = document.getElementById('play-button');
// const pauseButton = document.getElementById('pause-button');
// const currentSongDisplay = document.getElementById('current-song');
// let isPlaying = false;
// let currentSong = null;

// function loadSong(songUrl, songName) {
//     if (audioPlayer) {
//         audioPlayer.src = songUrl;
//         currentSong = songName;
//         if (currentSongDisplay) currentSongDisplay.textContent = songName;
//         if (playButton) playButton.disabled = false;
//         if (pauseButton) pauseButton.disabled = true;
//     } else {
//         console.warn("Elemento 'audio-player' não encontrado para loadSong (versão antiga).");
//     }
// }

// function playAudio() {
//     if (audioPlayer && audioPlayer.src) {
//         audioPlayer.play();
//         isPlaying = true;
//         if (playButton) playButton.disabled = true;
//         if (pauseButton) pauseButton.disabled = false;
//     } else {
//         console.warn('Áudio não carregado ou player não encontrado (versão antiga).');
//     }
// }

// function pauseAudio() {
//     if (audioPlayer) {
//         audioPlayer.pause();
//         isPlaying = false;
//         if (playButton) playButton.disabled = false;
//         if (pauseButton) pauseButton.disabled = true;
//     }
// }

// Exemplo de chamada que estava no código original - REMOVIDA DEVIDO A ERROS E REDUNDÂNCIA
// loadSong('loadSong(','./c:\Users\Matheus\Music\petrus.wav, Novin Yarp - MINHA PIKA TA DURA.wav', 'Minha Pika Tá Dura.'', 'Nome da Sua Música',');
// loadSong('./src/assets/musics/minha_musica.mp3', 'Nome da Minha Música'); // Se precisar de uma música padrão, integre com o player do DOMContentLoaded

// if (playButton) playButton.addEventListener('click', playAudio);
// if (pauseButton) pauseButton.addEventListener('click', pauseAudio);
*/