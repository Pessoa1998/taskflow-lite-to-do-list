# taskflow-lite-to-do-list

Um gerenciador de tarefas minimalista em página única (Single Page App), feito apenas com HTML, CSS e JavaScript puro. Ideal para estudos de manipulação do DOM, armazenamento no navegador e boas práticas de organização em projetos front-end sem frameworks (Sem custos)


# TaskFlow Lite ✅

Um gerenciador de tarefas minimalista construído com **HTML, CSS e JavaScript puro**, sem dependências externas.  
O objetivo é oferecer um exemplo claro e direto de como criar uma **SPA (Single Page Application)** simples, alternando entre "Home" e "Dashboard" em um único arquivo.

---

## 🚀 Funcionalidades

- Adicionar tarefas de forma rápida.
- Marcar tarefas como concluídas.
- Editar e excluir tarefas existentes.
- Interface de duas seções:
  - **Home** → tela inicial simples.
  - **Dashboard** → lista de tarefas com gerenciamento.
- Tudo funciona em **um único arquivo HTML**.

---

## 🛠️ Tecnologias utilizadas

- **HTML5** → estrutura semântica.
- **CSS3** → estilo responsivo e minimalista.
- **JavaScript (ES6)** → manipulação do DOM e lógica da aplicação.

---

```bash
const STORAGE_KEY = 'gabrielDemands';
let demands = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
```

## ➡️ Isso significa:

- O navegador tenta carregar o que já existe no localStorage na chave "gabrielDemands".
- Se não tiver nada salvo, ele cria um array vazio [].



## Quando você cadastra, edita ou finaliza uma demanda, o array demands é atualizado e depois é persistido novamente no Local Storage com a função save():

````bash
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(demands));
  updateAll();
}
````

- localStorage.setItem(...) → salva no navegador.
- JSON.stringify(demands) → transforma o array de objetos em texto JSON para poder armazenar.


# Onde ficam os dados de fato?

- Eles ficam no Local Storage do navegador que você usou (Chrome, Firefox, Edge, etc.).
- Cada navegador mantém esses dados localmente no seu computador, vinculados ao domínio/origem (neste caso, provavelmente file:// se você abriu direto no seu PC, ou o endereço do site se fosse publicado).

# Como visualizar?

Se você abrir o DevTools do navegador (pressione F12 → aba Aplicativo (Application) → menu Armazenamento (Storage) → Local Storage) vai encontrar uma chave chamada gabrielDemands com todas as atividades salvas em JSON.

Exemplo de como aparece salvo:

````bash
[
  {
    "id": 1,
    "title": "Estudar JavaScript",
    "description": "Fazer exercícios sobre funções",
    "type": "rotina",
    "receivedDate": "2025-09-24T14:30",
    "completedDate": null,
    "comment": ""
  },
  {
    "id": 2,
    "title": "Revisar código",
    "description": "Refatorar funções",
    "type": "esporadica",
    "receivedDate": "2025-09-24T15:00",
    "completedDate": "2025-09-24T16:20:30.123Z",
    "comment": "Revisado com sucesso"
  }
]

````
