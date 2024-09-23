const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
var path = require('path');

const ps = require('@prisma/client');
const prisma = new ps.PrismaClient();


const PLAYER_NUM = 3;//プレイヤーの数
let room = {};//ログインしたプレイヤーが入るオブジェクト
let players = {};//勝負するプレイヤーが入るオブジェクト
let choices = {};//出した手を記録するオブジェクト



// クライアント接続時の処理
io.on('connection', (socket) => {
    
    
    console.log('A user connected:', socket.id);
    
    // プレイヤーの登録
    socket.on('register', async(data) => {
        console.log(data.username);
        const username = data.username;
        const password = data.pass;
        try {
            // データベースから username と一致するプレイヤーを検索
            const player = await prisma.User.findUnique({
                where: {
                    name: username,  // 'name' はテーブルのカラム名
                },
            });
    
            if (player) {
                // プレイヤーが存在する場合
                console.log(`${username}という名前はすでに登録されています\n別の名前を登録してください`);
                
                // 登録失敗のメッセージをクライアントに送信
                socket.emit('registerResult', { message: 'failed'});
            } else {
                const newPlayer = await prisma.User.create({
                    data: {
                        name: username,  // 新しいプレイヤー名を追加
                        pass: password
                    }
                });
                // プレイヤーが存在しない場合
                room[socket.id] = newPlayer;
                console.log(`${username}がゲームに登録しました`);
                
                // 登録成功のメッセージをクライアントに送信
                socket.emit('registerResult', {
                     message: 'success',
                     playerData: newPlayer  // ここでプレイヤーデータを送信
                    });
            }
        } catch (error) {
            console.error('登録時にエラーが発生しました:', error);
            
            // エラーメッセージをクライアントに送信
            socket.emit('registerResult', { message: 'error' });
        }
    });



    // プレイヤーのログイン
    socket.on('login', async(data) => {

        const username = data.username;
        const password = data.pass;
        try {
            // データベースから username と一致するプレイヤーを検索
            const player = await prisma.User.findUnique({
                where: {
                    name: username,  // 'name' はテーブルのカラム名
                    pass: password
                }
            });

            let values = [];
            Object.keys(room).forEach(key => {
              const v = room[key].name;
              values.push(v);
            });

            console.log(values);
            if (player && (await ElementDuplicationCheck(values, socket.id, username))) {
                // プレイヤーが存在する場合
                room[socket.id] = player;
                console.log(`${username}がゲームにログインしました`);
                
                //console.log(room);
                // ログイン成功のメッセージをクライアントに送信
                socket.emit('loginResult', { 
                    message: 'success',
                    playerData: player  // ここでプレイヤーデータを送信
                    });
            } else {
                // プレイヤーが存在しない場合
                console.log(`${username}というプレイヤは存在しないか、すでにログインしています`);
                
                // ログイン失敗のメッセージをクライアントに送信
                socket.emit('loginResult', { message: 'failed' });
            }
        } catch (error) {
            console.error('ログイン時にエラーが発生しました:', error);
            
            // エラーメッセージをクライアントに送信
            socket.emit('loginError', { message: 'ログイン処理中にエラーが発生しました' });
        }
    });

    socket.on('start', () => {
        //ゲームスタートしている人数が3人より少ない時
        if(Object.keys(players).length < 3) {
            io.emit('GameStartResult', 'success');
            players[socket.id] = room[socket.id];
            console.log(`${room[socket.id].name}がゲームをスタートしました`);
            if(Object.keys(players).length == PLAYER_NUM) {
                console.log("人数が揃いました");
                console.log(players);
                io.emit('opponent', players);
            }
        } else {
            io.emit('GameStartResult', 'failed');
        }
    });

    // じゃんけんの選択を受け取る
    socket.on('choice', (choice) => {
        choices[socket.id] = choice;
        console.log(`${socket.id}は${choice}を選びました`)
        // 3人のプレイヤーが選択を行ったかチェック
        if (Object.keys(choices).length === PLAYER_NUM) {
            determineWinner();
        }
    });

    socket.on('restart', () => {
        console.log(`${room[socket.id].name}がもう一度対戦を希望しています`);
        socket.emit('restartOK');//再スタートを許可
    });

    socket.on('end', () => {
        console.log(`${room[socket.id].name}が対戦から退出しました`);
    });

    

    // クライアント切断時の処理
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        delete room[socket.id];
        delete players[socket.id];
        delete choices[socket.id];
    });
});


// 勝者の判定
async function determineWinner() {
    const playerIds = Object.keys(choices);
    const player1 = playerIds[0];
    const player2 = playerIds[1];
    const player3 = playerIds[2];

    const choice1 = choices[player1];
    const choice2 = choices[player2];
    const choice3 = choices[player3];

    let playersdb = {};

   
    let winner = {};
    if(choice1 == choice2 && choice2 == choice3) {
        winner = 'draw1';//みんな同じ手
        console.log(`引き分けです`);

        // 引分数をデータベースで更新
        await updateResult(players[player1].name, 'draw', choice1);
        await updateResult(players[player2].name, 'draw', choice2);
        await updateResult(players[player3].name, 'draw', choice3);
    } else if (choice1 != choice2 && choice2 != choice3 && choice1 != choice3){
        winner = 'draw3';//みんな異なる手
        console.log(`引き分けです`);

        // 引分数をデータベースで更新
        await updateResult(players[player1].name, 'draw', choice1);
        await updateResult(players[player2].name, 'draw', choice2);
        await updateResult(players[player3].name, 'draw', choice3);
    } else {
       if(choice1 == choice2) {
            if((choice1 == 'rock' && choice3 == 'scissors') || 
            (choice1 == 'scissors' && choice3 == 'paper') ||
            (choice1 == 'paper' && choice3 == 'rock')) {
                winner = `${players[player1].name}と${players[player2].name}`;
                console.log(`${winner}が勝ちました`);

                // 勝敗をデータベースで更新
                await updateResult(players[player1].name, 'win', choice1);
                await updateResult(players[player2].name, 'win', choice2);
                await updateResult(players[player3].name, 'lose', choice3);
            } else {
                winner = players[player3].name;
                console.log(`${winner}が勝ちました`);
                
                // 勝敗をデータベースで更新
                await updateResult(players[player1].name, 'lose', choice1);
                await updateResult(players[player2].name, 'lose', choice2);
                await updateResult(players[player3].name, 'win', choice3);
            }
       } else if(choice1 == choice3) {
            if((choice1 == 'rock' && choice2 == 'scissors') || 
            (choice1 == 'scissors' && choice2 == 'paper') ||
            (choice1 == 'paper' && choice2 == 'rock')) {
                winner = `${players[player1].name}と${players[player3].name}`;
                console.log(`${winner}が勝ちました`);

                // 勝敗をデータベースで更新
                await updateResult(players[player1].name, 'win', choice1);
                await updateResult(players[player2].name, 'lose', choice2);
                await updateResult(players[player3].name, 'win', choice3);
            } else {
                winner = players[player2].name;
                console.log(`${winner}が勝ちました`);
                
                // 勝敗の勝利数をデータベースで更新
                await updateResult(players[player1].name, 'lose', choice1);
                await updateResult(players[player2].name, 'win', choice2);
                await updateResult(players[player3].name, 'lose', choice3);
            }
       } else if(choice2 == choice3) {
            if((choice2 == 'rock' && choice1 == 'scissors') || 
                (choice2 == 'scissors' && choice1 == 'paper') ||
                (choice2 == 'paper' && choice1 == 'rock')) {
                    winner = `${players[player2].name}と${players[player3].name}`;
                    console.log(`${winner}が勝ちました`);

                    // 勝敗をデータベースで更新
                    await updateResult(players[player1].name, 'lose', choice1);
                    await updateResult(players[player2].name, 'win', choice2);
                    await updateResult(players[player3].name, 'win', choice3);
                } else {
                    winner = players[player1].name;
                    console.log(`${winner}が勝ちました`);

                    // 勝敗をデータベースで更新
                    await updateResult(players[player1].name, 'win', choice1);
                    await updateResult(players[player2].name, 'lose', choice2);
                    await updateResult(players[player3].name, 'lose', choice3);
                }
        }
    }
    

    //プレイヤーに更新しデータベースを送る
    playersdb[players[player1]] = await prisma.User.findUnique({
        where: {
            name: players[player1].name,  // 'name' はテーブルのカラム名
        },
    });

    playersdb[players[player2]] = await prisma.User.findUnique({
        where: {
            name: players[player2].name,  // 'name' はテーブルのカラム名
        },
    });

    playersdb[players[player3]] = await prisma.User.findUnique({
        where: {
            name: players[player3].name,  // 'name' はテーブルのカラム名
        },
    });

    console.log(playersdb);

    io.emit('result', { winner, choice1, choice2 , choice3, playersdb: playersdb});

    players = {}; // 次のラウンドに備えてリセット
    choices = {}; // 次のラウンドに備えてリセット
}

// 勝利数を更新する関数
async function updateResult(playerName, result, hand) {
    try {
        if(result == 'win') {
            await prisma.user.update({
                where: { name: playerName },
                data: {
                    win: { increment: 1 }, // 'win' カラムの値を1増やす
                    battle: { increment: 1 }//'battle'カラムの値を1増やす
                }
            });
            console.log(`${playerName}の${result}数が更新されました`);
        } else if(result == 'lose') {
            await prisma.user.update({
                where: { name: playerName },
                data: {
                    lose: { increment: 1 }, // 'win' カラムの値を1増やす
                    battle: { increment: 1 }//'battle'カラムの値を1増やす
                }
            });
            console.log(`${playerName}の${result}数が更新されました`);
        } else if(result == 'draw') {
            await prisma.user.update({
                where: { name: playerName },
                data: {
                    draw: { increment: 1 }, // 'win' カラムの値を1増やす
                    battle: { increment: 1 }//'battle'カラムの値を1増やす
                }
            });
            console.log(`${playerName}の${result}数が更新されました`);
        }
    } catch (error) {
        console.error(`${playerName}の勝利数更新に失敗しました:`, error);
    }
    updateHand(playerName, hand);
}


// 出した手の数を更新する関数
async function updateHand(playerName, hand) {
    try {
        if(hand == 'rock') {
            await prisma.user.update({
                where: { name: playerName },
                data: {
                    rock: { increment: 1 }, // 'rock' カラムの値を1増やす
                }
            });
        } else if(hand == 'scissor') {
            await prisma.user.update({
                where: { name: playerName },
                data: {
                    scissor: { increment: 1 }, // 'scissor' カラムの値を1増やす
                }
            });
        } else if(hand == 'paper') {
            await prisma.user.update({
                where: { name: playerName },
                data: {
                    paper: { increment: 1 }, // 'paper' カラムの値を1増やす
                }
            });
        } else {
            console.log("じゃんけんの手を選ぶ処理でエラーが発生しました。");
        }
        console.log(`${playerName}の${hand}の数が更新されました`);
    } catch (error) {
        console.error(`${playerName}の${hand}の数更新に失敗しました:`, error);
    }
}


app.use(express.static('public'));

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});

//オブジェクト内に重複がある場合false,ない場合trueを返す
async function ElementDuplicationCheck (obj, key, value) {
   // オブジェクトのすべての値を取得

  let values = obj;

  
  // 重複があるか確認
  if (values.includes(value)) {
    return false;  // 重複がある場合は追加しない
  }
  
  // 重複がなければオブジェクトに新しい要素を追加
  obj[key] = value;
  return true;
}