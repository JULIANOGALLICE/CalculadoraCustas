function arredondarABNT(valor, decimais = 2) {
  const multiplicador = Math.pow(10, decimais);
  // Ajuste de precisão para evitar 1.225 -> 1.224999999999999
  const valorMultiplicado = Math.round(valor * multiplicador * 10000000) / 10000000;
  const valorInteiro = Math.floor(valorMultiplicado);
  const fracao = valorMultiplicado - valorInteiro;

  let resultado;

  if (fracao < 0.5) {
    resultado = valorInteiro;
  } else if (fracao > 0.5) {
    resultado = valorInteiro + 1;
  } else {
    if (valorInteiro % 2 === 0) {
      resultado = valorInteiro;
    } else {
      resultado = valorInteiro + 1;
    }
  }

  return resultado / multiplicador;
}

console.log(arredondarABNT(1.225)); // 1.22
console.log(arredondarABNT(1.235)); // 1.24
console.log(arredondarABNT(2.5, 0)); // 2
console.log(arredondarABNT(3.5, 0)); // 4
