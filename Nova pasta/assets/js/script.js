const barraProgresso = document.getElementById('barra-progresso');

window.addEventListener('scroll', function () {
  const scrollTotal = document.documentElement.scrollHeight - window.innerHeight;
  const scrollAtual = window.scrollY;
  const porcentagem = (scrollAtual / scrollTotal) * 100;
  barraProgresso.style.width = porcentagem + '%';
});

const btnSpoiler  = document.getElementById('btn-spoiler');
const listaViloes = document.getElementById('lista-viloes');
let spoilerAberto = false;

btnSpoiler.addEventListener('click', function () {
  spoilerAberto = !spoilerAberto;

  if (spoilerAberto) {
    listaViloes.style.display = 'block';
    btnSpoiler.textContent    = '🙈 Ocultar Spoilers';
  } else {
    listaViloes.style.display = 'none';
    btnSpoiler.textContent    = '⚠️ Revelar Spoilers';
  }
});

const imagensGaleria = document.querySelectorAll('.galeria-item img');

imagensGaleria.forEach(function (img) {
  img.style.cursor = 'zoom-in';

  img.addEventListener('click', function () {
    abrirLightbox(img.src, img.alt);
  });
});

function abrirLightbox(src, alt) {
  const lightbox = document.createElement('div');
  lightbox.id = 'lightbox';

  const imgGrande = document.createElement('img');
  imgGrande.src = src;
  imgGrande.alt = alt;

  const btnFechar = document.createElement('button');
  btnFechar.id          = 'lightbox-fechar';
  btnFechar.textContent = '✕';

  lightbox.appendChild(imgGrande);
  lightbox.appendChild(btnFechar);
  document.body.appendChild(lightbox);

  btnFechar.addEventListener('click', function () {
    document.body.removeChild(lightbox);
  });

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) {
      document.body.removeChild(lightbox);
    }
  });

  document.addEventListener('keydown', function fecharEsc(e) {
    if (e.key === 'Escape' && document.getElementById('lightbox')) {
      document.body.removeChild(lightbox);
      document.removeEventListener('keydown', fecharEsc);
    }
  });
}

const linkTopo = document.querySelector('footer a[href="#topo"]');

linkTopo.addEventListener('click', function (e) {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});