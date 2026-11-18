'use strict';
// hola github
const BOARD = 450;//Ancho y largo del tablero
const pulso = ['1', '2', '3', '4', '5', '6'];

let game;
let n=8;// numero de columnas y filas

let tiempoBase = 0;//momento en el que sucedio el ultimo evento

let intervalo = 2000;//milisegundos de espera entre un pulso y otro

//conforman el temporizador que decide cada cuanto se pone un pulso (2 segundos)

let tiemposPulso={};//Areglo que guardalos tiempos en los que que nace cada pulso

const tiempoClick =1500//1.5 seundos es el tiempo en el que el halo demora en tocar al borde,donde e jugador debera clickear la celda o fallara

const margenError = 240 // ventana de tolereancia para que elclcik sea valido

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
  const progreso = constrain((millis() -  tInicio) / tiempoClick, 0, 1);
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
  }
};

const efectoError = (texto, c) => function (o) {
  const llave = `${o.row},${o.col}`;
  const tInicio = tiemposPulso[llave];
  if (!tInicio) return;

  const progreso = constrain((millis() - tInicio) / tiempoClick, 0,2.6);

  //se le asigna un color que puede desvanecerse
let colorDesvanecido = color(c);
  // map convierte el progreso (de 0 a 2.6) en opacidad (de 255 a 0)
  colorDesvanecido.setAlpha(map(progreso, 0,2.6, 255, 0));
  
  noStroke();
  fill(colorDesvanecido);
  const len = Quadrille.cellLength;
  textSize(len * 0.6);
  text(texto, len / 2, len / 2);

  //  cuando pasa 3s (progreso = 2.6), se auto-destruye
  if (progreso >= 2.6) {
    game.clear(o.row, o.col);
    delete tiemposPulso[llave];
  }
};

const stack = (...fx) => function (o) {
  fx.forEach(f => f.call(this, o));
};// es la funcion que permite apilar efectos

const EFFECTS = [
 stack(halo('#ffffff'),spot('#f98eff'),borde('#ffffff')),
  stack(halo('#ffffff'),spot('#23e2ff'),borde('#ffffff'))
];

let ipulso = 0;
let turn = '';
let contador = 0;

function endEfect(row,col,tiempoInicio){
  let diferencia= int(millis())-tiempoInicio;
  let duracion= 1500;
  if(diferencia>=duracion){
  game.clear(row,col);
  delete tiemposPulso[`${row},${col}`];
    }
 }

function verificarTimeout(row,col){
let tiempoInicial= tiemposPulso[`${row},${col}`];
let limite=1800;
let difer=int(millis())-tiempoInicial;
  if(difer>=limite){
  game.fill(row, col,efectoError('X','#ff4d6d'));
  }
  ;
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
  //se vacia el arreglo de los tiempos de cada pulso
}

function draw() {
  background('#0d0b16');

  motionData.t += 0.05;
  drawQuadrille(game, { outline: '#241f38', outlineWeight: 2, cellParams: motionData });
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

    ipulso = (ipulso + 1) % pulso.length;
    game.fill(row, col, EFFECTS[ipulso % EFFECTS.length]);

    tiemposPulso[`${row},${col}`] = millis();
    //se guardan las coordenadas del pulso generdo en la matriz
  }
}

function mousePressed() {
  const row = game.mouseRow;
  const col = game.mouseCol;
  if (game.isValid(row, col) && !game.isEmpty(row, col)) {
  let tempo = tiemposPulso[`${row},${col}`]
  const tiempoVida= int(millis())-tempo;
  //devuelve el tiempo de vida de la celda

  const diferencia = abs(tiempoVida - tiempoClick);
  
    //si la celda es valida y tiene un pulso
     

    // 2. Definimos una tolerancia (0 es perfecto, 0.15 es un buen margen para humanos)
    if (diferencia<=margenError) {
      contador++;
      console.log("¡PERFECTO! Puntos:", contador);
      
      // 3. Borramos la celda acertada
      game.fill(row, col, haloWin('#80ed99'));
      
      tiemposPulso[`${row},${col}`]=millis();
      endEfect(row,col,millis());
      // Reiniciamos si el tablero se llenó en algún momento
      if (game.order === game.size) {
        newRound();
      }
    } else {
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
