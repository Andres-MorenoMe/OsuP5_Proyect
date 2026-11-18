'use strict';

const BOARD = 450;//Ancho y largo del tablero
const pulso = ['1', '2', '3', '4', '5', '6'];
let icolor =1;
let game;
let n=8;// numero de columnas y filas

let tiempoBase = 0;//momento en el que sucedio el ultimo evento

let intervalo = 2000;//milisegundos de espera entre un pulso y otro

//conforman el temporizador que decide cada cuanto se pone un pulso (2 segundos)

let tiemposPulso={};//Areglo que guardalos tiempos en los que que nace cada pulso
let penalizadas = {};//Evita descontar vida varias veces por la misma celda

const tiempoClick =1500//1.5 seundos es el tiempo en el que el halo demora en tocar al borde,donde e jugador debera clickear la celda o fallara

const margenError = 240 // ventana de tolereancia para que elclcik sea valido

const VIDA_MAX = 100;
let vida = VIDA_MAX;

const PUNTOS_BASE = 100;
let puntos = 0;
let racha = 0;
let mejorRacha = 0;

const motionData = { t: 0, amp: 1 };
//t es el reloj/fase del pulso
// amp es la amplitud del pulso
// Extrae explícitamente row y col si existen en el objeto o la llamada

// Dibujamos usando la mitad de Quadrille.cellLength como centro de la celda


const spot = c => function () {
  noStroke();
  fill(c);
  const len = Quadrille.cellLength;
  circle(len / 2, len / 2, len * 0.72);
};//circulo estatico

const caracter =(texto,c) => function () {
  noStroke();
  fill(c);
  const len = Quadrille.cellLength;
  textSize(len * 0.4);
  text(texto, len / 2, len / 2);
};//dibuja un caracter de color
const borde = c => function () {
  noFill();
  stroke(c);
  strokeWeight(3);
  const len = Quadrille.cellLength;
  circle(len / 2, len / 2, len * 0.72);
};//contorno estatico


const halo = c => function (o) {
  const llave = `${o.row},${o.col}`;
  //se utiliza elobjeto automatico o para saber    las coordenadas
  const tInicio = tiemposPulso[llave];
  const amp = motionData.amp;
  const progreso = constrain((millis() -  tInicio) / tiempoClick, 0, 1);
  stroke(c);
  noFill();
  strokeWeight(3);
  const len = Quadrille.cellLength;
  const r = len * (0.72 + 1.5 * (1 - progreso))
  circle(len / 2, len / 2, r);
};//contorno que se encoje

const haloWin = c => function (o) {
  const llave = `${o.row},${o.col}`;
  //se utiliza elobjeto automatico o para saber    las coordenadas
  const tInicio = tiemposPulso[llave];
  const amp = motionData.amp;
  const progreso = constrain((millis() - tInicio) / 500, 0, 1);
  let colorOpaco = color(c);
  colorOpaco.setAlpha(255 * (1 - progreso)); 
  stroke(colorOpaco);
  noFill();
  strokeWeight(3);
  const len = Quadrille.cellLength;
  const r = len * (0.72 + (0.48 * progreso));
  circle(len / 2, len / 2, r);
  if (progreso >= 1) {
    game.clear(o.row, o.col); // Borra la celda visualmente
    delete tiemposPulso[llave]; // Borra el tiempo del arreglo
    delete penalizadas[llave];
  }
};

const textoWin = (texto, c) => function (o) {
  const llave = `${o.row},${o.col}`;
  const tInicio = tiemposPulso[llave];
  if (!tInicio) return;

  const progreso = constrain((millis() - tInicio) / 500, 0, 1);;
  let colorOpaco = color(c);
  colorOpaco.setAlpha(255 * (1 - progreso));

  const len = Quadrille.cellLength;
  push();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(len * 0.22);
  stroke(13, 11, 22, 255 * (1 - progreso));
  strokeWeight(3);
  fill(colorOpaco);
  text(texto, len / 2, len / 2 - progreso * 16);
  pop();
};

const efectoError = (texto, c) => function (o) {
  const llave = `${o.row},${o.col}`;
  const tInicio = tiemposPulso[llave];
  if (!tInicio) return;

  const progreso = constrain((millis() - tInicio) / 500, 0, 1);

  let colorDesvanecido = color(c);
  colorDesvanecido.setAlpha(map(progreso, 0, 1, 255, 0));
  
  noStroke();
  fill(colorDesvanecido);
  const len = Quadrille.cellLength;
  textSize(len * 0.6);
  text(texto, len / 2, len / 2);

  if (progreso >= 1) {
    game.clear(o.row, o.col);
    delete tiemposPulso[llave];
    delete penalizadas[llave];
  }
};

const stack = (...fx) => function (o) {
  fx.forEach(f => f.call(this, o));
};// es la funcion que permite apilar efectos

const EFFECTS = [
  stack(halo('#ffffff'),spot('#ff9ed2'),borde('#ffffff')),
  stack(halo('#ffffff'),spot('#23e2ff'),borde('#ffffff')),
  stack(halo('#ffffff'),spot('#80ff9f'),borde('#ffffff')),
  stack(halo('#ffffff'),spot('#ffea80'),borde('#ffffff'))
];

let ipulso = 0;
let turn = '';
let contador = 0;
let fallos = 0;

function esFinDeJuego() {
  return vida <= 0;
}


function verificarTimeout(row,col){
  const llave = `${row},${col}`;
  let tiempoInicial= tiemposPulso[llave];
  if (!tiempoInicial || penalizadas[llave]) return;
  let limite=1800;
  let difer=int(millis())-tiempoInicial;
  
  if(difer>=limite){
    penalizadas[llave] = true;
    fallos++;
    racha = 0;
    vida = constrain(vida - 20, 0, VIDA_MAX);
    tiemposPulso[llave] = millis();
    game.fill(row, col,efectoError('X','#ff4d6d'));
  }
}

function setup() {
  createCanvas(BOARD, BOARD + 40);
  textAlign(CENTER, CENTER);
  newRound();
}

function newRound() {
  Quadrille.cellLength = BOARD / n;
  game = createQuadrille(n, n);
  tiempoBase = millis();
  tiemposPulso = {};
  penalizadas = {};
  vida = VIDA_MAX;
  contador = 0;
  fallos = 0;
  puntos = 0;
  racha = 0;
  mejorRacha = 0;
  //se vacia el arreglo de los tiempos de cada pulso
}

function dibujarBarraVida() {
  push();
  const margen = 12;
  const x = margen;
  const y = BOARD + 8;
  const anchoTotal = BOARD - margen * 2;
  const alto = 24;

  // Fondo de la barra de vida
  noStroke();
  fill('#1b1630');
  rect(x, y, anchoTotal, alto, 6);

  // Relleno proporcional a la vida actual
  const anchoVida = anchoTotal * (vida / VIDA_MAX);
  if (vida > 50) {
    fill('#80ed99');
  } else if (vida > 25) {
    fill('#ffd166');
  } else {
    fill('#ff4d6d');
  }
  rect(x, y, anchoVida, alto, 6);

  // Contorno de la barra
  noFill();
  stroke('#3a3260');
  strokeWeight(2);
  rect(x, y, anchoTotal, alto, 6);

  // Texto de vida, racha y puntuación
  noStroke();
  fill('#ffffff');
  textSize(12);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  text(`VIDA: ${vida}%`, x + 10, y + alto / 2);

  textAlign(CENTER, CENTER);
  text(`RACHA: ${racha}x`, x + anchoTotal / 2, y + alto / 2);

  textAlign(RIGHT, CENTER);
  text(`PUNTOS: ${puntos}`, x + anchoTotal - 10, y + alto / 2);
  pop();
}

function draw() {
  background('#0d0b16');

  motionData.t += 0.05;
  drawQuadrille(game, { outline: '#241f38', outlineWeight: 2, cellParams: motionData });

  if (!esFinDeJuego()) {
    generador();
    if(game.order!=0){
    for (let row = 0; row < n; row++) {

      for (let col = 0; col < n; col++) {
          verificarTimeout(row,col);
        //
        }
    }
    }//fin del if
  }

  dibujarBarraVida();

  if (esFinDeJuego()) {
    push();
    fill(0, 0, 0, 180);
    rect(0, 0, BOARD, BOARD);
    fill('#ff4d6d');
    textAlign(CENTER, CENTER);
    textSize(48);
    textStyle(BOLD);
    text('WASTED', BOARD / 2, BOARD / 2 - 35);
    fill('#ffffff');
    textSize(15);
    textStyle(NORMAL);
    text('Puntos: ' + puntos + ' · Mejor racha: ' + mejorRacha + 'x', BOARD / 2, BOARD / 2 + 5);
    text('Aciertos: ' + contador + ' · Fallos: ' + fallos, BOARD / 2, BOARD / 2 + 30);
    textSize(13);
    text('Presiona una tecla para reiniciar', BOARD / 2, BOARD / 2 + 60);
    pop();
  }
}

function generador() {
  if (millis() - tiempoBase > intervalo) {
    tiempoBase = millis();

    if (game.order === game.size) {
      newRound();
      return;
    }

    let row, col;
    do { 
      row = int(random(0, n));
      col = int(random(0, n));
    } while (!game.isEmpty(row, col));

    const llave = `${row},${col}`;
    delete penalizadas[llave];

   

    
    //se obtiene el numero del arreglo
    let numeroActual = pulso[ipulso];
    //se obtiene el diseño de pulso que se va a utilizar
    let diseñoCirculo = EFFECTS[icolor];
    //usando stack se pone el numero del pulso
    game.fill(row, col, stack(diseñoCirculo, caracter(numeroActual, '#ffffff')));

    //se avanza en el orden del pulso
     ipulso = (ipulso + 1) % pulso.length;
    //Si ipulso volvió a 0 (completó los 6 números), cambiamos de color.
    // Si llega al final de los 4 colores, el módulo (%) lo devuelve al primer color (0).
    if (ipulso === 0) {
      icolor = (icolor + 1) % EFFECTS.length;
    }

    tiemposPulso[llave] = millis();
    //se guardan las coordenadas del pulso generdo en la matriz
  }
}

function mousePressed() {
  if (esFinDeJuego()) return;

  const row = game.mouseRow;
  const col = game.mouseCol;
  const llave = `${row},${col}`;

  if (game.isValid(row, col) && !game.isEmpty(row, col) && !penalizadas[llave]) {
  let tempo = tiemposPulso[llave]
  const tiempoVida= int(millis())-tempo;
  //devuelve el tiempo de vida de la celda

  const diferencia = abs(tiempoVida - tiempoClick);
  
    //si la celda es valida y tiene un pulso
     

    if (diferencia<=margenError) {
      contador++;
      racha++;
      mejorRacha = max(mejorRacha, racha);

      let puntosBaseNivel;
      let colorEfecto;
      let textoEfecto;

      if (diferencia <= margenError / 3) {
        puntosBaseNivel = 100;
        colorEfecto = '#80ed99';
        textoEfecto = '¡PERFECTO!';
      } else if (diferencia <= (margenError / 3) * 2) {
        puntosBaseNivel = 70;
        colorEfecto = '#23e2ff';
        textoEfecto = '¡MEDIO!';
      } else {
        puntosBaseNivel = 50;
        colorEfecto = '#ffea80';
        textoEfecto = '¡CASI!';
      }
      const puntosGanados = puntosBaseNivel + (racha * 10);
      puntos += puntosGanados;
      
      penalizadas[llave] = true;
      vida = constrain(vida + 8, 0, VIDA_MAX);
      
      game.fill(row, col, stack(haloWin(colorEfecto), textoWin(`${textoEfecto}\n+${puntosGanados}`, colorEfecto)));
      
      tiemposPulso[llave]=millis();
      // Reiniciamos si el tablero se llenó en algún momento
      if (game.order === game.size) {
        newRound();
      }
    }  else {
      penalizadas[llave] = true;
      fallos++;
      racha = 0;
      vida = constrain(vida - 15, 0, VIDA_MAX);
      tiemposPulso[llave] = millis();
      game.fill(row, col, efectoError('X', '#ff4d6d'));
      console.log("¡Fallaste! El halo estaba muy lejos. Distancia:", diferencia);
    }

    
    if (game.order === game.size) {
      newRound();
    }
  }
  //tiempoBase = millis();
}

function keyPressed() {
  if (key.length !== 1) {
    return;
  }
  newRound();
}
