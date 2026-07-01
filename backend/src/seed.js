require('dotenv').config();
const { getDb, closeDb } = require('./db');

const filmes = [
  { titulo: 'Panico (1996)', conteudo: 'O filme original. Na pacata Woodsboro, o assassino mascarado Ghostface aterroriza adolescentes.', imagem: 'https://static.wikia.nocookie.net/panicobrasil/images/5/5a/P%C3%A2nico_1_filme_poster.jpg/revision/latest?cb=20241208144035&path-prefix=pt-br', ordem: 1 },
  { titulo: 'Panico 2 (1997)', conteudo: 'Dois anos depois, Sidney e universitaria e uma nova onda de assassinatos recomeca.', imagem: 'https://static.wikia.nocookie.net/dublagempedia/images/9/93/Panico2.jpg/revision/latest?cb=20200826235909&path-prefix=pt-br', ordem: 2 },
  { titulo: 'Panico 3 (2000)', conteudo: 'Sidney descobre verdades ocultas sobre sua mae.', imagem: 'https://br.web.img2.acsta.net/c_310_420/medias/nmedia/18/96/27/30/20456789.jpg', ordem: 3 },
  { titulo: 'Panico 4 (2011)', conteudo: 'Apos 11 anos, Sidney volta a Woodsboro. Ultimo filme dirigido por Wes Craven.', imagem: 'https://br.web.img3.acsta.net/c_310_420/medias/nmedia/18/87/32/73/19874353.jpg', ordem: 4 },
  { titulo: 'Panico (2022)', conteudo: 'Requel com novos protagonistas e retorno do trio classico.', imagem: 'https://m.media-amazon.com/images/I/619B976VjhL._AC_SY879_.jpg', ordem: 5 },
  { titulo: 'Panico VI (2023)', conteudo: 'Primeiro filme ambientado fora de Woodsboro: a acao se passa em Nova York.', imagem: 'https://www.cine14bis.com.br/site/wp-content/uploads/2023/02/14664_medio.jpg', ordem: 6 },
  { titulo: 'Panico VII (2026)', conteudo: 'Kevin Williamson retorna como diretor. Sidney Prescott volta para proteger sua filha.', imagem: 'https://jardimdasamericas.com.br/uploads/2026/02/capa-filme-panico-7-f23e9-large.jpg', ordem: 7 },
];

const db = getDb();
const count = db.prepare('SELECT COUNT(*) as n FROM filmes').get().n;

if (count === 0) {
  const insert = db.prepare('INSERT INTO filmes (titulo, conteudo, imagem, ordem) VALUES (?, ?, ?, ?)');
  filmes.forEach(f => insert.run(f.titulo, f.conteudo, f.imagem, f.ordem));
  console.log(`Seed: ${filmes.length} filmes inseridos.`);
} else {
  console.log(`Seed ignorado: ${count} filmes ja existem.`);
}

closeDb();
