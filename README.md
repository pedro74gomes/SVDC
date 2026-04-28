# SVDC

# Dashboard Analítico Interativo

[![Aceder ao Dashboard Ao Vivo](https://img.shields.io/badge/Aceder_ao_Dashboard-Ao_Vivo-2ecc71?style=for-the-badge)](INSERIR_LINK_DO_GITHUB_PAGES_AQUI)

## Sobre o Projeto
Este projeto foi desenvolvido como método de avaliação para a disciplina de Sistemas de Visualização de Dados e Conhecimento. O objetivo principal é transformar dados em bruto num dashboard interativo que permita aos decisores extrair insights rápidos e acionáveis.

O dataset analisado foca-se em **[Inserir tema: ex: Vendas de Retalho / Dados de Recursos Humanos]**, e a aplicação permite filtrar a visualização globalmente por **[Inserir categoria de filtro: ex: País / Departamento]**.

## Funcionalidades e Visualizações

O dashboard é composto por 5 visualizações principais, totalmente dinâmicas e responsivas:

1. **KPIs Executivos (Cartões):** Apresentam as métricas de topo (Valor Total, Volume, Média e Variedade).
2. **Evolução Temporal (Gráfico de Linhas):** Ilustra a tendência de [Métrica X] ao longo do tempo.
3. **Top 10 Categorias (Gráfico de Barras Horizontais):** Destaca os elementos com melhor performance de forma decrescente.
4. **Distribuição Percentual (Gráfico Circular/Donut):** Mostra o peso de cada [Métrica Y] no total.
5. **Relação de Variáveis (Gráfico de Dispersão):** Analisa a correlação entre [Coluna X] e [Coluna Y], limitado a uma amostra otimizada para garantir alta performance no navegador.

Além disso, inclui uma **Tabela de Dados Dinâmica** que lista o Top 15 dos registos mais valiosos.

## Tecnologias Utilizadas

* **HTML5 & CSS3:** Estruturação do layout, tipografia e sistema de *Grid/Flexbox* para design responsivo.
* **JavaScript (ES6):** Lógica de limpeza de dados (*Data Wrangling*), cálculo de métricas matemáticas e eventos de interatividade (*Tooltips*, filtros globais).
* **D3.js (v7):** Biblioteca principal utilizada para manipulação do DOM e renderização de ficheiros vetoriais (SVG) com base nos dados ingeridos (*Data-Driven Documents*).

## Como executar o projeto localmente

Caso pretenda correr o projeto na sua máquina em vez de utilizar o link ao vivo:

1. Faça o clone deste repositório ou descarregue o ficheiro `.zip`.
2. Abra a pasta do projeto num editor de código (recomenda-se o Visual Studio Code).
3. Devido a políticas de segurança CORS dos navegadores para ficheiros locais, inicie um servidor local. Pode utilizar a extensão **Live Server** no VS Code.
4. O dashboard abrirá automaticamente no seu navegador predefinido (geralmente em `http://127.0.0.1:5500/`).

---
*Projeto desenvolvido por PG60289 - Pedro Gomes.*
