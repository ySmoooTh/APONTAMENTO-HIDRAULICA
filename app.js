const timers = {};
const STORAGE_KEY = "apontamento_hidraulica_estado";
const FILA_KEY =
    "apontamento_hidraulica_fila";

function obterFilaLocal(){

    return JSON.parse(
        localStorage.getItem(FILA_KEY)
    ) || [];

}

function adicionarFila(dados){

    const fila =
        obterFilaLocal();

    fila.push(dados);

    localStorage.setItem(
        FILA_KEY,
        JSON.stringify(fila)
    );

    atualizarIndicadorSincronizacao();

}

const modal = document.getElementById("modalInicio");
const modalParada =
    document.getElementById("modalParada");
const syncStatus =
    document.getElementById("syncStatus");


const API_URL =
"https://script.google.com/macros/s/AKfycbwRw1gTzA0izFjTVzBBIj65Y1XNylk3O6i_fKSnhI4Gs_ttEIy_MYuc3fXii2iMc94i/exec";

const TEMPO_META = 510;

let cardSelecionado = null;
let sincronizandoFila = false;

function atualizarIndicadorSincronizacao(){

    if(!syncStatus){
        return;
    }

    const pendentes =
        obterFilaLocal().length;

    syncStatus.classList.remove(
        "sync-online",
        "sync-offline",
        "sync-pending"
    );

    if(!navigator.onLine){

        syncStatus.classList.add("sync-offline");
        syncStatus.innerText =
            pendentes > 0
                ? `OFFLINE (${pendentes} registros pendentes)`
                : "OFFLINE";
        return;

    }

    if(sincronizandoFila){

        syncStatus.classList.add("sync-pending");
        syncStatus.innerText =
            pendentes > 0
                ? `SINCRONIZANDO (${pendentes} pendentes)`
                : "SINCRONIZANDO";
        return;

    }

    if(pendentes > 0){

        syncStatus.classList.add("sync-pending");
        syncStatus.innerText =
            `${pendentes} registros pendentes`;
        return;

    }

    syncStatus.classList.add("sync-online");
    syncStatus.innerText = "ONLINE";

}

document.querySelectorAll(".btn-iniciar").forEach(botao => {


botao.addEventListener("click", () => {

    cardSelecionado =
        botao.closest(".card");

    modal.style.display = "flex";

});


});

document
.querySelector(".cancelar")
.addEventListener("click", () => {


modal.style.display = "none";


});

document
.querySelector(".confirmar")
.addEventListener("click", async () => {
const btnConfirmar =
    document.querySelector(".confirmar");

if(btnConfirmar.disabled){
    return;
}

btnConfirmar.disabled = true;

const registro =
    document.getElementById("registro").value;

const op =
    document.getElementById("op").value;

if (!registro || !op) {

    btnConfirmar.disabled = false;

    alert("Informe Registro e OP");

    return;

}

const operador =
    cardSelecionado
        .querySelector("h2")
        .innerText;

try {

    await gravarEvento({

        operador,
        registro,
        op,

        evento: "INICIO",

        contador: 0

    });

} catch (erro) {

btnConfirmar.disabled = false;

alert("Erro ao gravar");

return;

}

cardSelecionado.classList.remove("livre");
cardSelecionado.classList.add("produzindo");

cardSelecionado.dataset.operador = operador;
cardSelecionado.dataset.registro = registro;
cardSelecionado.dataset.op = op;
cardSelecionado.dataset.contador = 0;
cardSelecionado.dataset.ultimoApontamento =
    Date.now();
cardSelecionado.dataset.paradasAcumuladas =
    0;

cardSelecionado.querySelector(".info-topo")
    .innerHTML = `
        <div>OP: ${op}</div>
        <div>RG: ${registro}</div>
    `;

cardSelecionado.querySelector(".status")
    .innerHTML = "PRODUZINDO";

const botao =
    cardSelecionado.querySelector(".btn-iniciar");

botao.outerHTML = `
    <button class="btn-apontar">
        APONTAR
    </button>

    <button class="btn-parada">
        PARADA
    </button>

    <button class="btn-finalizar">
        FINALIZAR
    </button>
`;

adicionarEventosBotoes(cardSelecionado);

iniciarCronometro(cardSelecionado);

btnConfirmar.disabled = false;
modal.style.display = "none";

document.getElementById("registro").value = "";
document.getElementById("op").value = "";
salvarEstado();


});

function adicionarEventosBotoes(card){

    const btnApontar =
        card.querySelector(".btn-apontar");

    if(btnApontar){

        btnApontar.addEventListener(
            "click",
            () => apontar(card)
        );

    }

    const btnParada =
        card.querySelector(".btn-parada");

    if(btnParada){

        btnParada.addEventListener(
            "click",
            () => {

                cardSelecionado = card;

                modalParada.style.display =
                    "flex";

            }
        );

    }

    const btnFinalizar =
    card.querySelector(".btn-finalizar");

if(btnFinalizar){

    btnFinalizar.addEventListener(
        "click",
        () => finalizar(card)
    );

}

    const btnRetornar =
        card.querySelector(".btn-retornar");

    if(btnRetornar){

        btnRetornar.addEventListener(
            "click",
            async () => {

                cardSelecionado = card;

                const tempoParado =
                    Math.floor(
                        (
                            Date.now() -
                            Number(
                                card.dataset.inicioParada || Date.now()
                            )
                        ) / 1000
                    );

                card.dataset.paradasAcumuladas =
                    Number(
                        card.dataset.paradasAcumuladas || 0
                    ) +
                    (tempoParado * 1000);

                await gravarEvento({

                    operador:
                        card.dataset.operador,

                    registro:
                        card.dataset.registro,

                    op:
                        card.dataset.op,

                    evento:
                        "RETORNO",

                    tempoParado:
                        tempoParado

                });

                card.classList.remove(
                    "parado"
                );

                card.classList.add(
                    "produzindo"
                );

                card.querySelector(".status")
                    .innerText = "PRODUZINDO";

                const acoes =
                    card.querySelector(".acoes-operador");

                acoes.innerHTML = `
                    <button class="btn-apontar">
                        APONTAR
                    </button>

                    <button class="btn-parada">
                        PARADA
                    </button>

                    <button class="btn-finalizar">
                        FINALIZAR
                    </button>
                `;

                adicionarEventosBotoes(card);
                resetarCronometro(card);
                iniciarCronometro(card);
                salvarEstado();

            }
        );

    }

}

async function apontar(card){

    let contador =
        Number(
            card.dataset.contador
        );

    contador++;

    const agora =
        Date.now();

    const duracao =
        Math.floor(
            (
                agora -
                Number(
                    card.dataset.ultimoApontamento
                ) -
                Number(
                    card.dataset.paradasAcumuladas || 0
                )
            ) / 1000
        );

    card.dataset.contador =
        contador;

    card.dataset.ultimoApontamento =
        agora;

    card.dataset.paradasAcumuladas =
        0;

    card.querySelector(".contador")
        .innerText = contador;

    const minutos =
        String(
            Math.floor(duracao / 60)
        ).padStart(2,"0");

    const segundos =
        String(
            duracao % 60
        ).padStart(2,"0");

    card.querySelector(".ultimo-tempo")
        .innerText =
        `${minutos}:${segundos}`;

    resetarCronometro(card);
    iniciarCronometro(card);
    salvarEstado();

    gravarEvento({

        operador:
            card.dataset.operador,

        registro:
            card.dataset.registro,

        op:
            card.dataset.op,

        evento:
            "APONTAMENTO",

        contador:
            contador,

        duracao:
            duracao

    }).catch(console.error);

}

async function gravarEvento(dados){

    if(!navigator.onLine){

        adicionarFila(dados);

        return;
    }

    try{

        await fetch(API_URL, {

            method:"POST",

            body:JSON.stringify({

                operador: dados.operador || "",
                registro: dados.registro || "",
                op: dados.op || "",
                evento: dados.evento || "",
                motivo: dados.motivo || "",
                contador: dados.contador || "",
                turno: dados.turno || "",
                duracao: dados.duracao || "",
                tempoParado: dados.tempoParado || ""

            })

        });

    }catch(e){

        adicionarFila(dados);

    }

    atualizarIndicadorSincronizacao();

}



document
.querySelector(".cancelar-parada")
.addEventListener("click", () => {

    modalParada.style.display =
        "none";

});
document
.querySelector(".confirmar-parada")
.addEventListener("click", async () => {

    const motivo =
        document.getElementById("motivoParada").value;

    if(!motivo){

        alert("Selecione um motivo");

        return;

    }

    cardSelecionado.dataset.inicioParada =
        Date.now();

    await gravarEvento({

        operador:
            cardSelecionado.dataset.operador,

        registro:
            cardSelecionado.dataset.registro,

        op:
            cardSelecionado.dataset.op,

        evento:
            "PARADA",

        motivo:
            motivo

    });

    cardSelecionado.classList.remove(
        "produzindo"
    );

    cardSelecionado.classList.add(
        "parado"
    );

    cardSelecionado.querySelector(".status")
        .innerText = "PARADO";

    const btnApontar =
        cardSelecionado.querySelector(".btn-apontar");

    const btnParada =
        cardSelecionado.querySelector(".btn-parada");

    const btnFinalizar =
        cardSelecionado.querySelector(".btn-finalizar");

    if(btnApontar) btnApontar.remove();

    if(btnParada) btnParada.remove();

    if(btnFinalizar){

        btnFinalizar.insertAdjacentHTML(
            "beforebegin",
            `
            <button class="btn-retornar">
                RETORNAR
            </button>
            `
        );

    }

    adicionarEventosBotoes(cardSelecionado);
    salvarEstado();

    modalParada.style.display = "none";

});

async function finalizar(card){

    const confirmar =
        confirm(
            `Finalizar OP ${card.dataset.op}?\n\nProduzidos: ${card.dataset.contador} quadros`
        );

    if(!confirmar){
        return;
    }

    await gravarEvento({

        operador:
            card.dataset.operador,

        registro:
            card.dataset.registro,

        op:
            card.dataset.op,

        evento:
            "FINALIZADO",

        contador:
            card.dataset.contador

    });

    clearInterval(
        timers[
            card.dataset.operador
        ]
    );

    card.classList.remove(
        "produzindo",
        "parado"
    );

    card.classList.add(
        "livre"
    );

    card.querySelector(".info-topo")
        .innerHTML = `
            <div>OP: -----</div>
            <div>RG: -----</div>
        `;

    card.querySelector(".contador")
        .innerText = "0";

    card.querySelector(".ultimo-tempo")
        .innerText = "00:00";

    card.querySelector(".timer-text")
        .innerText = "00:00";

    card.querySelector(".status")
        .innerText = "LIVRE";

    const circulo =
        card.querySelector(".ring-progress");

    circulo.style.stroke =
        "#16a34a";

    circulo.style.strokeDashoffset =
        163;

    const acoes =
        card.querySelector(".acoes-operador");

    acoes.innerHTML = `
        <button class="btn-iniciar">
            INICIAR
        </button>
    `;

    delete card.dataset.operador;
    delete card.dataset.registro;
    delete card.dataset.op;
    delete card.dataset.contador;
    delete card.dataset.ultimoApontamento;
    delete card.dataset.paradasAcumuladas;
    delete card.dataset.inicioParada;

    const btnIniciar =
        card.querySelector(".btn-iniciar");

    btnIniciar.addEventListener(
        "click",
        () => {

            cardSelecionado = card;

            modal.style.display =
                "flex";

        }
    );

    salvarEstado();

}

function iniciarCronometro(card){
const timerTexto =
    card.querySelector(".timer-text");

const circulo =
    card.querySelector(".ring-progress");

if(!timerTexto || !circulo){
    return;
}

const circumference = 163;

let segundos = 0;

timers[
    card.dataset.operador
] = setInterval(() => {

    segundos++;

    const minutos =
        String(
            Math.floor(segundos / 60)
        ).padStart(2,"0");

    const resto =
        String(
            segundos % 60
        ).padStart(2,"0");

    timerTexto.innerText =
        `${minutos}:${resto}`;

    const percentual =
        Math.min(
            segundos / TEMPO_META,
            1
        );

    const offset =
        circumference -
        (circumference * percentual);

    circulo.style.strokeDashoffset =
        offset;

    if(segundos >= TEMPO_META){

        circulo.style.stroke =
            "#f59e0b";

    }

    if(segundos >= TEMPO_META + 60){

        circulo.style.stroke =
            "#dc2626";

    }

},1000);


}

function salvarEstado() {

    const dados = [];
    let temAtivos = false;

    document.querySelectorAll(".card").forEach(card => {

        if(card.dataset.op){
            temAtivos = true;
        }

        dados.push({

            operador: card.dataset.operador || "",
            registro: card.dataset.registro || "",
            op: card.dataset.op || "",
            contador: card.dataset.contador || 0,

            ultimoApontamento:
                card.dataset.ultimoApontamento || "",

            paradasAcumuladas:
                card.dataset.paradasAcumuladas || 0,

            inicioParada:
                card.dataset.inicioParada || "",

            status:
                card.querySelector(".status").innerText,

            infoTopo:
                card.querySelector(".info-topo").innerHTML,

            ultimoTempo:
                card.querySelector(".ultimo-tempo").innerText

        });

    });

    if(!temAtivos){
        localStorage.removeItem(STORAGE_KEY);
        return;
    }

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(dados)
    );

}

function resetarCronometro(card){


const timerTexto =
    card.querySelector(".timer-text");

const circulo =
    card.querySelector(".ring-progress");

timerTexto.innerText =
    "00:00";

circulo.style.strokeDashoffset =
    163;

circulo.style.stroke =
    "#16a34a";

clearInterval(
    timers[
        card.dataset.operador
    ]
);

}

async function sincronizarFila(){

    sincronizandoFila = true;
    atualizarIndicadorSincronizacao();

    const fila =
        obterFilaLocal();

    if(fila.length === 0){
        sincronizandoFila = false;
        atualizarIndicadorSincronizacao();
        return;
    }

    const restante = [];

    for(const item of fila){

        try{

            await fetch(API_URL,{

                method:"POST",

                body:JSON.stringify(item)

            });

        }catch{

            restante.push(item);

        }

    }

    localStorage.setItem(
        FILA_KEY,
        JSON.stringify(restante)
    );

    sincronizandoFila = false;
    atualizarIndicadorSincronizacao();

}
window.addEventListener(
    "online",
    sincronizarFila
);
window.addEventListener(
    "offline",
    atualizarIndicadorSincronizacao
);
window.addEventListener(
    "load",
    restaurarEstado
);
function restaurarEstado(){

    const dados =
        JSON.parse(
            localStorage.getItem(STORAGE_KEY)
        );

    if(!dados){
        return;
    }

    const cards =
        document.querySelectorAll(".card");

    dados.forEach((item,index)=>{

        if(!item.op){
            return;
        }

        const card = cards[index];

        card.dataset.operador =
            item.operador;

        card.dataset.registro =
            item.registro;

        card.dataset.op =
            item.op;

        card.dataset.contador =
            item.contador;

        card.dataset.ultimoApontamento =
            item.ultimoApontamento;

        card.dataset.paradasAcumuladas =
            item.paradasAcumuladas;

        card.dataset.inicioParada =
            item.inicioParada || "";

        card.querySelector(".contador")
            .innerText =
            item.contador;

        card.querySelector(".ultimo-tempo")
            .innerText =
            item.ultimoTempo;

        card.querySelector(".info-topo")
            .innerHTML =
            item.infoTopo;

        card.querySelector(".status")
            .innerText =
            item.status;

        card.classList.remove(
            "livre",
            "produzindo",
            "parado"
        );

        if(item.status === "PARADO"){
            card.classList.add("parado");
        } else if(item.status === "PRODUZINDO"){
            card.classList.add("produzindo");
        } else {
            card.classList.add("livre");
        }

        const acoes =
            card.querySelector(".acoes-operador");

        if(item.status === "PARADO"){
            acoes.innerHTML = `
                <button class="btn-retornar">
                    RETORNAR
                </button>

                <button class="btn-finalizar">
                    FINALIZAR
                </button>
            `;
        } else {
            acoes.innerHTML = `
                <button class="btn-apontar">
                    APONTAR
                </button>

                <button class="btn-parada">
                    PARADA
                </button>

                <button class="btn-finalizar">
                    FINALIZAR
                </button>
            `;
        }

        adicionarEventosBotoes(card);

        if(item.status === "PRODUZINDO"){
            iniciarCronometro(card);
        }

    });

}
window.addEventListener(
    "load",
    atualizarIndicadorSincronizacao
);
window.addEventListener(
    "beforeunload",
    salvarEstado
);

if("serviceWorker" in navigator){

   navigator.serviceWorker
    .register("./sw.js")
    .then(reg => {

        reg.update();

        setInterval(() => {
            reg.update();
        }, 60000);

    });

}
