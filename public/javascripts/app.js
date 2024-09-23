const socket = io();
const PLAYER_NUM = 3;//プレイヤーの数
const MAX_SELECT_CHOICE_NUM = 1;//自分の手を選べる最大回数
let myname;//自分の名前
let select_num = 0;//自分の手を選んだ回数
let opponent;//全プレイヤーを格納するオブジェクト
let start_btn_jadge = false;//スタートボタンを押したらtrue,押してゲームがスタートしている場合はfalseにする
let game_jadge = false;//trueの時はゲームスタートをしている,falseはしていない
let profile_jadge = false;//trueならプロフィールを開いている状態

let playerdb;//プレイヤーのデータベース


//プレイヤーの名前を登録
document.getElementById('registerBtn').onclick = () => {
    const username = document.getElementById('username').value;
    const pass = document.getElementById('pass').value;
    myname = username;
    socket.emit('register', {username, pass});
    socket.on('registerResult', data => {
        const registerresult = Object.values(data)[0];
        playerdb = Object.values(data)[1];
        if(registerresult == 'success') {
            console.log("登録に成功しました。");
            document.getElementById('name').innerText = username;
            document.getElementById('username').style.display = 'none';
            document.getElementById('pass').style.display = 'none';
            document.getElementById('registerBtn').style.display = 'none';
            document.getElementById('loginBtn').style.display = 'none';
            document.getElementById('profileBtn').style.display = 'block';
            document.getElementById('startBtn').style.display = 'block';
        } else if(registerresult == 'failed') {
            console.log("登録に失敗しました。\n同じ名前が存在します");
        } else {
            console.log("登録時にエラーが発生しました。");
        }
    });
};

//プレイヤーのログイン
document.getElementById('loginBtn').onclick = () => {
    const username = document.getElementById('username').value;
    const pass = document.getElementById('pass').value;
    myname = username;
    socket.emit('login', {username, pass});
    socket.on('loginResult', data => {
        const loginresult = Object.values(data)[0];
        playerdb = Object.values(data)[1];
        if(loginresult == 'success') {
            console.log("ログインに成功しました。");
            console.log(playerdb);
            document.getElementById('name').innerText = username;
            document.getElementById('username').style.display = 'none';
            document.getElementById('pass').style.display = 'none';
            document.getElementById('registerBtn').style.display = 'none';
            document.getElementById('loginBtn').style.display = 'none';
            document.getElementById('profileBtn').style.display = 'block';
            document.getElementById('startBtn').style.display = 'block';
        } else if(loginresult == 'failed') {
            console.log("ログインに失敗しました。\n名前かパスワードが間違えている可能性があります");
        } else {
            console.log("ログイン時にエラーが発生しました。");
        }
    });
};


//プロフィールボタンを押したらプロフィールを表示
document.getElementById('profileBtn').onclick = () => {

    const table = document.getElementById('table');
    const tbody = document.getElementById('tbody');
    if(!profile_jadge) {
        profile_jadge = true;
        document.getElementById('profile').style.display = 'block';


        //表の項目を作成代入


        // 表の行を作成
        const Itemrow = document.createElement("tr");
        Object.keys(playerdb).forEach(key => {
            if((key != "pass") && (key != "createdAt") && (key != "updatedAt")) {
                const cell = document.createElement("td");
                const cellText = document.createTextNode(`${key}`);

                cell.appendChild(cellText);
                Itemrow.appendChild(cell);
            }
        });
        // 表の本体の末尾に行を追加
        tbody.appendChild(Itemrow);


        //表の要素を作成・代入
        const Elementrow = document.createElement("tr");

        // <td> 要素とテキストノードを作成し、テキストノードを
        // <td> の内容として、その <td> を表の行の末尾に追加
        Object.keys(playerdb).forEach(key => {
            if((key != "pass") && (key != "createdAt") && (key != "updatedAt")) {
                const cell = document.createElement("td");
                const cellText = document.createTextNode(`${playerdb[key]}`);

                cell.appendChild(cellText);
                Elementrow.appendChild(cell);
            }
        });
        // 表の本体の末尾に行を追加
        tbody.appendChild(Elementrow);

    } else {
        profile_jadge = false;
        tbody.innerHTML = "";
        document.getElementById('profile').style.display = 'none';
    }
    
};

//スタートボタンを押したらゲーム開始
document.getElementById('startBtn').onclick = () => {
    //スタートボタンを押したことを確認
    start_btn_jadge = true;
    socket.emit('start');
    
};


//サーバーからゲームを開始していいかの結果を受け取る
socket.on('GameStartResult', data => {
    if(start_btn_jadge) {
        //スタートボタンを押してない状態に戻す
        start_btn_jadge = false;
        if(data == 'success') {
            game_jadge = true;
            //プロフィール欄を開いていたときにそれを閉じる
            if(profile_jadge == true) {
                profile_jadge = false;
                const tbody = document.getElementById('tbody');
                tbody.innerHTML = "";
                document.getElementById('profile').style.display = 'none';
            }
            console.log("ゲームスタート");
            document.getElementById('startBtn').style.display = 'none';
            document.getElementById('profileBtn').style.display = 'none';
            document.getElementById('standby').style.display = 'block';
        } else if(data == 'failed') {
            console.log("ゲーム内の定員オーバー");
        } else {
            console.log("ゲームスタートの処理でエラー");
        }
    }
});

//サーバーから相手の名前を受け取る
socket.on('opponent', data => {
    if(game_jadge == true) {
        opponent = Object.values(data);
        document.getElementById('standby').style.display = 'none';
        document.getElementById('game').style.display = 'block';
        let opp = [];

        let cnt = 0;
        for(let i=0;i<PLAYER_NUM;i++) {
            if(opponent[i].name != myname) {
                cnt++;
                console.log("op" + opponent[i].name);
                opp.push(opponent[i].name);

                const rock_per = parseFloat((opponent[i].rock/opponent[i].battle * 100).toFixed(2));
                const scissor_per = parseFloat((opponent[i].scissor/opponent[i].battle * 100).toFixed(2));
                const paper_per = parseFloat((opponent[i].paper/opponent[i].battle * 100).toFixed(2));

                console.log(`rock = ${rock_per}%`);
                console.log(`scissor = ${scissor_per}%`);
                console.log(`paper = ${paper_per}%`);

                document.getElementById(`per${cnt}`).innerText = `${opponent[i].name}
                                                            rock = ${rock_per}%
                                                            scissor = ${scissor_per}%
                                                            paper = ${paper_per}%`;
            }
        }
    
        let oppname = `${opp[0]}と${opp[1]}`;
        document.getElementById('opponent').innerText = `相手は${oppname}です`;
    }
});


//クリックされた手の種類をサーバーに送る
document.querySelectorAll('.choiceImg').forEach(btn => {
    btn.onclick = () => {
        let select;
        select_num++;
        //じゃんけんの手を選択できる回数を1回にする
        if(select_num <= MAX_SELECT_CHOICE_NUM) {
            const choice = btn.getAttribute('data-choice');
            socket.emit('choice', choice);
            select = `あなたの手は${ChangeJapanese(choice)}です`;
            document.getElementById('select').innerText = select;
        }
    };
});

//勝負の結果をサーバーから受け取り表示する
socket.on('result', data => {
    if(game_jadge == true) {
        let resultText;

        //データベースをサーバーから受け取る
        playerdb = data.playersdb[myname];
        if (data.winner === 'draw1') {
            resultText = `引き分け! 全てのプレイヤーが同じ手を選びました`;
        }else if(data.winner === 'draw3') {
            resultText = "引き分け! 全てのプレイヤーが異なる手を選びました。";
        } else {
            resultText = `${data.winner} の勝ち!`;
        }

        document.getElementById('result').innerText = 
        resultText + 
        `\n${opponent[0].name}の手:${ChangeJapanese(data.choice1)}` + 
        `\n${opponent[1].name}の手:${ChangeJapanese(data.choice2)}` + 
        `\n${opponent[2].name}の手:${ChangeJapanese(data.choice3)}`;
        document.getElementById('restart').style.display = 'block';
    }
});

//"もう一度"のボタンを押したとき
document.getElementById('restartBtn').onclick = () => {
    socket.emit('restart');

    console.log("もう一度");

    //htmlを初期化
    select_num = 0;
    document.getElementById('restart').style.display = 'none';
    document.getElementById('game').style.display = 'none';
    document.getElementById('opponent').innerText = '';
    document.getElementById('select').innerText = '';
    document.getElementById('result').innerText = '';

    socket.on('restartOK', () => {
        //スタートボタンを押したことにする
        start_btn_jadge = true;
        socket.emit('start');
    });
};

//"終了する"のボタンを押した時
document.getElementById('endBtn').onclick = () => {
    socket.emit('end');
    game_jadge = false;
    console.log("終了");

    //htmlを初期化
    select_num = 0;
    document.getElementById('restart').style.display = 'none';
    document.getElementById('game').style.display = 'none';
    document.getElementById('opponent').innerText = '';
    document.getElementById('select').innerText = '';
    document.getElementById('result').innerText = '';
    document.getElementById('startBtn').style.display = 'block';
    document.getElementById('profileBtn').style.display = 'block';
};




//自分の選んだ手を英語から日本語に変える関数
function ChangeJapanese(choicehand) {
    if(choicehand == 'rock') {
        choicehand = 'グー';
    } else if(choicehand == 'scissor') {
        choicehand = 'チョキ';
    } else if(choicehand == 'paper') {
        choicehand = 'パー';
    }
    return choicehand;
}
