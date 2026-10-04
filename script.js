document.documentElement.classList.add('com-js');

const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const barraSuperior = document.querySelector('.barra-superior');
const barraProgresso = document.querySelector('.trilha-progresso span');
const secoes = [...document.querySelectorAll('.secao-observada')];
const linksDoMenu = [...document.querySelectorAll('.navegacao-secoes a')];

// Os blocos entram suavemente na tela. Para quem prefere menos movimento,
// tudo aparece de uma vez.
const itensParaRevelar = [...document.querySelectorAll('.revelar')];

if (reduzirMovimento || !('IntersectionObserver' in window)) {
  itensParaRevelar.forEach((item) => item.classList.add('visivel'));
} else {
  const observador = new IntersectionObserver((entradas, proprioObservador) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;

      entrada.target.classList.add('visivel');
      proprioObservador.unobserve(entrada.target);
    });
  }, {
    rootMargin: '0px 0px -9% 0px',
    threshold: 0.08,
  });

  itensParaRevelar.forEach((item) => observador.observe(item));
}

let atualizacaoPendente = false;

function atualizarNavegacao() {
  const alturaRolavel = document.documentElement.scrollHeight - window.innerHeight;
  const progresso = alturaRolavel > 0 ? Math.min(window.scrollY / alturaRolavel, 1) : 0;
  barraProgresso.style.transform = `scaleX(${progresso})`;

  const linhaDeLeitura = window.scrollY + Math.min(window.innerHeight * 0.38, 300);
  let secaoAtual = secoes[0];

  secoes.forEach((secao) => {
    if (secao.offsetTop <= linhaDeLeitura) secaoAtual = secao;
  });

  // Em telas altas, o encerramento pode não alcançar a linha de leitura.
  // Chegar ao fim da página resolve esse caso sem depender da altura da tela.
  const chegouAoFim = Math.ceil(window.scrollY + window.innerHeight)
    >= document.documentElement.scrollHeight - 2;

  if (chegouAoFim) secaoAtual = secoes.at(-1);

  const idAtual = secaoAtual?.id;

  linksDoMenu.forEach((link) => {
    const estaAtivo = link.dataset.secao === idAtual;
    link.classList.toggle('ativa', estaAtivo);

    if (estaAtivo) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });

  const estaEmFundoEscuro = idAtual === 'matriz' || idAtual === 'encerramento';
  barraSuperior.classList.toggle('escura', estaEmFundoEscuro);
  atualizacaoPendente = false;
}

function agendarAtualizacao() {
  if (atualizacaoPendente) return;

  atualizacaoPendente = true;
  requestAnimationFrame(atualizarNavegacao);
}

window.addEventListener('scroll', agendarAtualizacao, { passive: true });
window.addEventListener('resize', agendarAtualizacao, { passive: true });
atualizarNavegacao();

// A numeração e os totais são montados a partir dos próprios cartões.
// Assim, incluir ou retirar um item no HTML não deixa a contagem errada.
const quadrantes = [...document.querySelectorAll('.quadrante')];
const cartoes = [...document.querySelectorAll('.cartao-ponto')];

quadrantes.forEach((quadrante) => {
  const cartoesDoGrupo = [...quadrante.querySelectorAll('.cartao-ponto')];
  const contador = quadrante.querySelector('.contador-pontos');

  cartoesDoGrupo.forEach((cartao, indice) => {
    cartao.querySelector('.numero-ponto').textContent = String(indice + 1).padStart(2, '0');
  });

  if (!contador) return;

  const total = cartoesDoGrupo.length;
  const numero = contador.querySelector('strong');
  numero.textContent = total;
  contador.replaceChildren(numero, document.createTextNode(total === 1 ? ' ponto' : ' pontos'));
});

function fecharCartao(cartao, semAnimacao = false) {
  const botao = cartao.querySelector('button');
  const detalhe = cartao.querySelector('.detalhe-ponto');

  window.clearTimeout(cartao.temporizadorFechamento);
  window.cancelAnimationFrame(cartao.quadroDeAbertura);
  botao.setAttribute('aria-expanded', 'false');
  cartao.classList.remove('aberto');

  cartao.temporizadorFechamento = window.setTimeout(() => {
    if (!cartao.classList.contains('aberto')) detalhe.hidden = true;
  }, semAnimacao || reduzirMovimento ? 0 : 360);
}

function abrirCartao(cartao) {
  const botao = cartao.querySelector('button');
  const detalhe = cartao.querySelector('.detalhe-ponto');
  const quadrante = cartao.closest('.quadrante');

  // Mantém somente um cartão aberto em cada grupo da matriz.
  quadrante.querySelectorAll('.cartao-ponto').forEach((outroCartao) => {
    const outroBotao = outroCartao.querySelector('button');
    const estaAberto = outroBotao.getAttribute('aria-expanded') === 'true';

    if (outroCartao !== cartao && estaAberto) fecharCartao(outroCartao);
  });

  window.clearTimeout(cartao.temporizadorFechamento);
  window.cancelAnimationFrame(cartao.quadroDeAbertura);
  detalhe.hidden = false;
  botao.setAttribute('aria-expanded', 'true');
  cartao.quadroDeAbertura = requestAnimationFrame(() => cartao.classList.add('aberto'));
}

cartoes.forEach((cartao) => {
  const botao = cartao.querySelector('button');

  botao.addEventListener('click', () => {
    const estaAberto = botao.getAttribute('aria-expanded') === 'true';
    if (estaAberto) fecharCartao(cartao);
    else abrirCartao(cartao);
  });
});

document.addEventListener('keydown', (evento) => {
  if (evento.key !== 'Escape') return;

  const botaoAberto = document.querySelector('.cartao-ponto button[aria-expanded="true"]');
  if (!botaoAberto) return;

  fecharCartao(botaoAberto.closest('.cartao-ponto'));
  botaoAberto.focus();
});

// Alguns navegadores restauram atributos ao voltar pelo histórico.
// Este trecho garante que o visual acompanhe o estado restaurado.
window.addEventListener('pageshow', () => {
  cartoes.forEach((cartao) => {
    const botao = cartao.querySelector('button');
    const estaAberto = botao.getAttribute('aria-expanded') === 'true';

    cartao.classList.toggle('aberto', estaAberto);
    cartao.querySelector('.detalhe-ponto').hidden = !estaAberto;
  });

  atualizarNavegacao();
});
