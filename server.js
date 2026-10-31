import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { randomInt } from 'node:crypto';
const app=express(); const http=createServer(app); const io=new Server(http); app.use(express.static('public'));
const bank=[
['Which team won the first Super Bowl?',['Green Bay Packers','Kansas City Chiefs','Dallas Cowboys','New York Jets'],0],
['How many players are on the court for one NBA team?',['4','5','6','7'],1],
['What sport uses a puck?',['Baseball','Hockey','Tennis','Soccer'],1],
['How many strikes make an out in baseball?',['2','3','4','5'],1],
['What is a perfect score in ten-pin bowling?',['200','250','300','350'],2],
['Which country won the 2022 FIFA World Cup?',['France','Brazil','Argentina','Germany'],2],
['How many points is a touchdown worth before the extra point?',['3','6','7','8'],1],
['What is the name of the NBA championship trophy?',['Stanley Cup','Lombardi Trophy','Larry O’Brien Trophy','Commissioner’s Trophy'],2],
['In tennis, what comes after deuce if one player wins a point?',['Set','Advantage','Match','Love'],1],
['How many periods are in a regulation NHL game?',['2','3','4','5'],1],
['What is the maximum number of points from one standard basketball shot?',['1','2','3','4'],2],
['What is the length of a marathon, approximately?',['13.1 miles','20 miles','26.2 miles','30 miles'],2],
['Which sport features a scrum?',['Rugby','Golf','Swimming','Cricket'],0],
['How many holes are in a standard full round of golf?',['9','12','18','24'],2],
['In soccer, who may use their hands inside their own penalty area?',['Striker','Goalkeeper','Defender','Referee'],1],
['Which MLB team plays home games at Fenway Park?',['Yankees','Red Sox','Cubs','Dodgers'],1],
['What is the NFL championship game called?',['World Series','Super Bowl','Stanley Cup Final','Final Four'],1],
['How many rings are on the Olympic flag?',['4','5','6','7'],1],
['What is the term for zero in tennis scoring?',['Blank','Nil','Love','Duck'],2],
['How many bases are on a baseball diamond, including home plate?',['3','4','5','6'],1]
];
const rooms=new Map();const duration=15000;
function cleanName(s){return String(s||'').trim().slice(0,20)}
function code(){let c;do{c=Array.from({length:5},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(32)]).join('')}while(rooms.has(c));return c}
function members(r){return [...r.players.values()].map(p=>({id:p.id,name:p.name,score:p.score,connected:p.connected}))}
function state(r){io.to(r.code).emit('roomState',{code:r.code,host:r.host,players:members(r),phase:r.phase,round:r.round,total:r.questions.length})}
function endQuestion(r){if(r.phase!=='question')return;clearTimeout(r.timer);r.phase='results';let q=r.questions[r.round];io.to(r.code).emit('results',{correct:q[2],answer:q[1][q[2]],players:members(r).sort((a,b)=>b.score-a.score),answers:[...r.answers.entries()].map(([id,a])=>({id,choice:a.choice,points:a.points}))});state(r)}
function next(r){clearTimeout(r.timer);r.round++;r.answers=new Map();if(r.round>=r.questions.length){r.phase='finished';io.to(r.code).emit('finished',{players:members(r).sort((a,b)=>b.score-a.score)});state(r);return}r.phase='question';let q=r.questions[r.round];r.started=Date.now();io.to(r.code).emit('question',{round:r.round+1,total:r.questions.length,text:q[0],choices:q[1],duration,deadline:r.started+duration});state(r);r.timer=setTimeout(()=>endQuestion(r),duration+150)}
function remove(socket){const c=socket.data.room;const r=rooms.get(c);if(!r)return;let p=r.players.get(socket.id);if(!p)return;r.players.delete(socket.id);r.answers.delete(socket.id);if(!r.players.size){clearTimeout(r.timer);rooms.delete(c);return}if(r.host===socket.id)r.host=r.players.keys().next().value;state(r);if(r.phase==='question'&&r.answers.size===r.players.size)endQuestion(r)}
io.on('connection',socket=>{
socket.on('create',({name}={},cb=()=>{})=>{name=cleanName(name);if(!name)return cb({error:'Enter your name.'});remove(socket);let c=code();let r={code:c,host:socket.id,players:new Map(),phase:'lobby',round:-1,questions:[],answers:new Map(),timer:null};r.players.set(socket.id,{id:socket.id,name,score:0,connected:true});rooms.set(c,r);socket.join(c);socket.data.room=c;cb({ok:true,code:c});state(r)});
socket.on('join',({name,code:c}={},cb=()=>{})=>{name=cleanName(name);c=String(c||'').trim().toUpperCase();let r=rooms.get(c);if(!name)return cb({error:'Enter your name.'});if(!r)return cb({error:'Room not found.'});if(r.phase!=='lobby')return cb({error:'Game already started. Join a new room.'});if(r.players.size>=20)return cb({error:'Room is full.'});remove(socket);r.players.set(socket.id,{id:socket.id,name,score:0,connected:true});socket.join(c);socket.data.room=c;cb({ok:true,code:c});state(r)});
socket.on('start',(_,cb=()=>{})=>{let r=rooms.get(socket.data.room);if(!r||r.host!==socket.id)return cb({error:'Only the host can start.'});if(r.phase!=='lobby')return cb({error:'Game already started.'});if(r.players.size<2)return cb({error:'At least two players are required.'});r.questions=[...bank].sort(()=>Math.random()-.5).slice(0,10);r.round=-1;for(let p of r.players.values())p.score=0;cb({ok:true});next(r)});
socket.on('answer',({choice}={},cb=()=>{})=>{let r=rooms.get(socket.data.room);if(!r||r.phase!=='question'||!r.players.has(socket.id))return cb({error:'No active question.'});if(r.answers.has(socket.id))return cb({error:'Already answered.'});if(!Number.isInteger(choice)||choice<0||choice>3)return cb({error:'Invalid answer.'});let elapsed=Date.now()-r.started;if(elapsed>duration)return cb({error:'Time is up.'});let correct=choice===r.questions[r.round][2];let points=correct?(elapsed<=3000?1000:elapsed<=6000?800:elapsed<=10000?600:400):0;r.players.get(socket.id).score+=points;r.answers.set(socket.id,{choice,points});cb({ok:true,points,correct});io.to(r.code).emit('answerCount',{count:r.answers.size,total:r.players.size});if(r.answers.size===r.players.size)endQuestion(r)});
socket.on('next',(_,cb=()=>{})=>{let r=rooms.get(socket.data.room);if(!r||r.host!==socket.id||r.phase!=='results')return cb({error:'Only the host can continue.'});cb({ok:true});next(r)});
socket.on('restart',(_,cb=()=>{})=>{let r=rooms.get(socket.data.room);if(!r||r.host!==socket.id||r.phase!=='finished')return cb({error:'Only the host can restart.'});r.phase='lobby';r.round=-1;r.questions=[];for(let p of r.players.values())p.score=0;cb({ok:true});state(r)});
socket.on('disconnect',()=>remove(socket));
});
http.listen(process.env.PORT||3000,()=>console.log('Sports Trivia Showdown listening'));
