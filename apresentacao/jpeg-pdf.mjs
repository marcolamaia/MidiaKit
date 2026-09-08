/**
 * Monta um PDF em que cada página é uma JPEG inteira.
 *
 * Serve para a versão leve do media kit: leitor de celular não precisa desenhar
 * degradê, sombra nem máscara de transparência — só decodificar uma foto. Abre
 * em qualquer aparelho, ao custo de o texto não ser mais selecionável.
 *
 * JPEG entra no PDF sem recompressão: o filtro DCTDecode aceita o arquivo cru.
 * Por isso não há dependência externa aqui.
 */

/** Lê largura e altura de uma JPEG percorrendo os marcadores SOFn. */
function jpegSize(buf) {
  let i = 2; // pula o SOI (FFD8)
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    // SOF0..SOF15, menos DHT (C4), JPGA (C8) e DAC (CC)
    if (marker >= 0xc0 && marker <= 0xcf &&
        marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error('JPEG sem marcador SOF: não dá para ler as dimensões');
}

/**
 * @param {Buffer[]} images  uma JPEG por página, na ordem
 * @param {{width:number,height:number}} page  caixa da página, em pontos
 * @returns {Buffer} o PDF
 */
export function jpegPdf(images, page) {
  const chunks = [];
  const offsets = [0];        // offsets[n] = posição do objeto n
  let pos = 0;

  const put = (s) => {
    const b = Buffer.isBuffer(s) ? s : Buffer.from(s, 'latin1');
    chunks.push(b);
    pos += b.length;
  };
  const obj = (n, body) => {
    offsets[n] = pos;
    put(`${n} 0 obj\n`);
    put(body);
    put('\nendobj\n');
  };

  const n = images.length;
  // 1 = catálogo, 2 = árvore de páginas, depois 3 objetos por página
  const pageId     = (i) => 3 + i * 3;
  const contentId  = (i) => 4 + i * 3;
  const imageId    = (i) => 5 + i * 3;

  put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Count ${n} /Kids [${
    images.map((_, i) => `${pageId(i)} 0 R`).join(' ')}] >>`);

  images.forEach((jpg, i) => {
    const { width, height } = jpegSize(jpg);

    obj(pageId(i),
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] ` +
      `/Resources << /XObject << /Im0 ${imageId(i)} 0 R >> >> ` +
      `/Contents ${contentId(i)} 0 R >>`);

    // desenha a imagem ocupando a página inteira
    const stream = `q ${page.width} 0 0 ${page.height} 0 0 cm /Im0 Do Q`;
    obj(contentId(i), `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);

    offsets[imageId(i)] = pos;
    put(`${imageId(i)} 0 obj\n`);
    put(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
        `/Length ${jpg.length} >>\nstream\n`);
    put(jpg);
    put('\nendstream\nendobj\n');
  });

  const total = 2 + n * 3;          // maior número de objeto usado
  const xref = pos;
  put(`xref\n0 ${total + 1}\n`);
  put('0000000000 65535 f \n');
  for (let i = 1; i <= total; i++) {
    put(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  put(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  return Buffer.concat(chunks);
}
