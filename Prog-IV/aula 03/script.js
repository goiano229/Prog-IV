let pontuacao = 0;
let tempoJogo = 15;
let intervaloJogo;

const areaJogo = document.getElementById("areaJogo");
const mostrarPontuacao = document.getElementById("pontuacao");
const botaoIniciar = document.getElementById("botaoIniciar");

botaoIniciar.addEventListener("click", iniciarJogo);

function iniciarJogo() {
    pontuacao = 0;
    tempoJogo = 15;
    mostrarPontuacao.textContent = "Pontuação: 0";

    intervaloJogo = setInterval(criarInimigo, 700);

    setTimeout(encerrarJogo, tempoJogo * 1000);
}

function criarInimigo() {
    const inimigo = document.createElement("img");

    inimigo.src = "mask_yami.png";
    inimigo.classList.add("inimigo");

    let posicaoX = Math.random() * (areaJogo.clientWidth - 60);
    let posicaoY = Math.random() * (areaJogo.clientHeight - 60);

    inimigo.style.left = posicaoX + "px";
    inimigo.style.top = posicaoY + "px";

    inimigo.addEventListener("click", () => {
        pontuacao++;
        mostrarPontuacao.textContent = "Pontuação: " + pontuacao;

        inimigo.style.transform = "scale(1.5)";
        inimigo.style.opacity = "0.5";

        setTimeout(() => inimigo.remove(), 100);
    });

    areaJogo.appendChild(inimigo);

    setTimeout(() => {
        inimigo.remove();
    }, 800);
}

function encerrarJogo() {
    clearInterval(intervaloJogo);
    alert("Fim de jogo! Pontuação: " + pontuacao);
}