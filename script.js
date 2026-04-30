// ==========================================
// 1. CONFIGURAÇÕES GERAIS (COVID-19 + Demografia)
// ==========================================
const CONFIG = {
    dataset: "covid_data.csv",
    separador: ";",
    formatoData: "%d/%m/%Y",
    colunaData: "date",
    colunaValorPrincipal: "new_cases",
    colunaValorSecundario: "new_deaths",
    colunaCategoriaPrimaria: "country",
    colunaCategoriaSecundaria: "continent",
    
    // Novas Variáveis Demográficas
    colunaPop: "population",
    colunaPIB: "gdp_per_capita",
    colunaIdade: "median_age"
};

const parseDate = d3.timeParse(CONFIG.formatoData);
const formatNumber = d => d3.format(",.0f")(d).replace(/,/g, ' ');

// ==========================================
// 2. FUNÇÃO GENÉRICA DE LIMPEZA
// ==========================================
function cleanData(d) {
    for (let key in d) {
        if (typeof d[key] === "string" && d[key].trim() !== "") {
            let valParaTestar = d[key].replace(',', '.');
            if (!isNaN(valParaTestar)) d[key] = +valParaTestar;
        }
    }
    
    if (d[CONFIG.colunaData]) d.DataFormatada = parseDate(d[CONFIG.colunaData]);
    
    // Cinto de Segurança para métricas operacionais
    if (d[CONFIG.colunaValorPrincipal] === "" || isNaN(d[CONFIG.colunaValorPrincipal])) d[CONFIG.colunaValorPrincipal] = 0;
    if (d[CONFIG.colunaValorSecundario] === "" || isNaN(d[CONFIG.colunaValorSecundario])) d[CONFIG.colunaValorSecundario] = 0;
    
    // Cinto de Segurança para métricas demográficas
    if (d[CONFIG.colunaPop] === "" || isNaN(d[CONFIG.colunaPop])) d[CONFIG.colunaPop] = 0;
    if (d[CONFIG.colunaPIB] === "" || isNaN(d[CONFIG.colunaPIB])) d[CONFIG.colunaPIB] = 0;
    if (d[CONFIG.colunaIdade] === "" || isNaN(d[CONFIG.colunaIdade])) d[CONFIG.colunaIdade] = 0;
    
    return d;
}

const tooltip = d3.select("body").append("div").attr("class", "tooltip");
let originalData = [];
let currentFilteredData = [];

// ==========================================
// 3. CARREGAMENTO E LÓGICA DE FILTRO
// ==========================================
d3.dsv(CONFIG.separador, CONFIG.dataset, cleanData).then(data => {
    
    // Guardamos apenas linhas que tenham pelo menos um país e dados válidos
    originalData = data.filter(d => d[CONFIG.colunaCategoriaPrimaria] !== undefined);
    currentFilteredData = originalData;

    const categoriasFiltro = [...new Set(originalData.map(d => d[CONFIG.colunaCategoriaSecundaria] || "Desconhecido"))].sort();
    const select = d3.select("#filter-select");
    
    categoriasFiltro.forEach(cat => {
        if (cat !== "Desconhecido" && cat !== "") {
            select.append("option").attr("value", cat).text(cat);
        }
    });

    select.on("change", function() {
        const selectedValue = d3.select(this).property("value");
        currentFilteredData = selectedValue === "all" ? originalData : originalData.filter(d => d[CONFIG.colunaCategoriaSecundaria] === selectedValue);
        updateDashboard(currentFilteredData);
    });

    updateDashboard(currentFilteredData);

}).catch(err => console.error("Erro ao carregar ficheiro:", err));

// ==========================================
// CENTRAL DE ATUALIZAÇÃO (KPIs Adaptados)
// ==========================================
function updateDashboard(data) {
    if(data.length === 0) return;

    // 1. Total de Novos Casos no período/filtro
    const totalCases = d3.sum(data, d => d[CONFIG.colunaValorPrincipal]);
    
    // 2. Total de Mortes no período/filtro
    const totalDeaths = d3.sum(data, d => d[CONFIG.colunaValorSecundario]);
    
    // 3. Taxa de Letalidade Aparente (Mortes / Casos)
    const taxaLetalidade = totalCases > 0 ? (totalDeaths / totalCases) * 100 : 0;
    
    // 4. Países Analisados
    const totalCountries = new Set(data.map(d => d[CONFIG.colunaCategoriaPrimaria])).size;
    
    // Atualizar o HTML
    d3.select("#kpi-1").text(formatNumber(totalCases)); 
    d3.select("#kpi-2").text(formatNumber(totalDeaths)); 
    d3.select("#kpi-3").text(taxaLetalidade.toFixed(2) + "%"); 
    d3.select("#kpi-4").text(totalCountries); 

    drawBarChart(data);
    drawLineChart(data);
    drawDonutChart(data);
    drawScatterPlot(data);
    drawDataTable(data);
    drawBubbleChart(data);
    drawAgeGroupBar(data);
}

// ==========================================
// 4. FUNÇÕES DE DESENHO
// ==========================================

function drawBarChart(data) {
    const container = d3.select("#chart-barras");
    
    // 1. MEDIR PRIMEIRO (Evita o Efeito Sanfona ao redimensionar o ecrã)
    let containerWidth = container.node().getBoundingClientRect().width;
    if (containerWidth === 0) containerWidth = 600; // Cinto de segurança
    
    // 2. APAGAR DEPOIS
    container.selectAll("*").remove();
    
    // 3. PROCESSAR DADOS (Top 10)
    const aggregated = d3.rollups(data, 
            v => d3.sum(v, d => d[CONFIG.colunaValorPrincipal]), 
            d => d[CONFIG.colunaCategoriaPrimaria]
        )
        .map(([key, value]) => ({key: key || "Sem Categoria", value}))
        .sort((a, b) => d3.descending(a.value, b.value))
        .slice(0, 10);
        
    if(aggregated.length === 0) return;
    
    // 4. DIMENSÕES E MARGENS (Margem direita aumentada para o último número não cortar)
    const margin = {top: 20, right: 40, bottom: 40, left: 160}; 
    const width = containerWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // 5. CRIAR O SVG
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
        
    // 6. ESCALAS (O .nice() garante que a última marca engloba o valor máximo)
    const x = d3.scaleLinear()
        .domain([0, d3.max(aggregated, d => d.value)])
        .nice() 
        .range([0, width]); 
        
    const y = d3.scaleBand()
        .domain(aggregated.map(d => d.key))
        .range([0, height])
        .padding(0.3);
        
    const colorScale = d3.scaleLinear()
        .domain([0, d3.max(aggregated, d => d.value)])
        .range(["#e74c3c", "#900C3F"]); // Paleta do vermelho ao bordeaux

    // 7. GRELHAS E EIXOS
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(6).tickSize(-height).tickFormat(""));
        
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d => d3.format(".2s")(d)));
        
    svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll(".tick text")
        .text(d => d.length > 20 ? d.substring(0, 18) + "..." : d);

    // 8. DESENHAR AS BARRAS (Com Tooltips e Animação de Entrada)
    svg.selectAll(".bar")
        .data(aggregated)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", d => y(d.key))
        .attr("height", y.bandwidth())
        .attr("x", 0)
        .attr("width", 0) // Começa com largura 0 para fazer a transição
        .attr("fill", d => colorScale(d.value))
        .attr("rx", 4) // Cantos suavemente arredondados
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 0.8);
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`<strong>${d.key}</strong><br/>Casos: ${formatNumber(d.value)}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("opacity", 1);
            tooltip.transition().duration(500).style("opacity", 0);
        })
        .transition() // A animação começa aqui
        .duration(800)
        .attr("width", d => x(d.value)); 
}

function drawLineChart(data) {
    const container = d3.select("#chart-linha");
    container.selectAll("*").remove();
    const validData = data.filter(d => d.DataFormatada);
    const aggregated = d3.rollups(validData, v => d3.sum(v, d => d[CONFIG.colunaValorPrincipal]), d => d3.timeMonth(d.DataFormatada))
        .map(([date, value]) => ({date, value})).sort((a, b) => d3.ascending(a.date, b.date));
    if(aggregated.length === 0) return;
    const margin = {top: 20, right: 30, bottom: 30, left: 60};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    const svg = container.append("svg").attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3.scaleTime().domain(d3.extent(aggregated, d => d.date)).range([0, width]);
    const y = d3.scaleLinear().domain([0, d3.max(aggregated, d => d.value) * 1.1 || 10]).range([height, 0]);

    svg.append("g").attr("class", "grid").call(d3.axisLeft(y).tickSize(-width).tickFormat(""));
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b %Y")));
    svg.append("g").call(d3.axisLeft(y).tickFormat(d3.format(".2s")));

    const line = d3.line().x(d => x(d.date)).y(d => y(d.value)).curve(d3.curveMonotoneX);
    svg.append("path").datum(aggregated).attr("fill", "none").attr("stroke", "#e67e22").attr("stroke-width", 3).attr("d", line);
    svg.selectAll(".dot").data(aggregated).enter().append("circle").attr("cx", d => x(d.date)).attr("cy", d => y(d.value)).attr("r", 5).attr("fill", "#e67e22").attr("stroke", "#fff")
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`<strong>${d3.timeFormat("%b %Y")(d.date)}</strong><br/>Casos: ${formatNumber(d.value)}`).style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
        }).on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
}

function drawDonutChart(data) {
    const container = d3.select("#chart-circular");
    container.selectAll("*").remove();
    const aggregated = d3.rollups(data, v => d3.sum(v, d => d[CONFIG.colunaValorPrincipal]), d => d[CONFIG.colunaCategoriaSecundaria] || "Outro")
        .map(([key, value]) => ({key, value})).sort((a, b) => d3.descending(a.value, b.value));
    if(aggregated.length === 0) return;
    const width = container.node().getBoundingClientRect().width;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 20;
    const svg = container.append("svg").attr("width", width).attr("height", height).append("g").attr("transform", `translate(${width/2},${height/2})`);
    const color = d3.scaleOrdinal(d3.schemeSet3); 
    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.55).outerRadius(radius);
    const arcHover = d3.arc().innerRadius(radius * 0.55).outerRadius(radius + 10);

    const paths = svg.selectAll("path").data(pie(aggregated)).enter().append("path").attr("fill", d => color(d.data.key)).attr("stroke", "white").style("stroke-width", "2px")
        .on("mouseover", function(event, d) {
            d3.select(this).transition().duration(200).attr("d", arcHover);
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`<strong>${d.data.key}</strong><br/>Casos: ${formatNumber(d.data.value)}`).style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
        }).on("mouseout", function() {
            d3.select(this).transition().duration(200).attr("d", arc);
            tooltip.transition().duration(500).style("opacity", 0);
        });

    paths.transition().duration(1000).attrTween("d", function(d) {
        const i = d3.interpolate({startAngle: 0, endAngle: 0}, d);
        return function(t) { return arc(i(t)); }
    });

    const totalCirc = d3.sum(aggregated, d => d.value);
    svg.append("text").attr("text-anchor", "middle").attr("dy", "-0.2em").style("font-size", "12px").style("fill", "#7f8c8d").text("Total Casos");
    svg.append("text").attr("text-anchor", "middle").attr("dy", "1em").style("font-size", "18px").style("font-weight", "bold").text(d3.format(".2s")(totalCirc));
}

function drawScatterPlot(data) {
    const container = d3.select("#chart-dispersao");
    container.selectAll("*").remove();

    // Agrupar dados e extrair Continente
    const aggregated = d3.rollups(data, 
        v => ({
            casos: d3.sum(v, d => d[CONFIG.colunaValorPrincipal]),
            mortes: d3.sum(v, d => d[CONFIG.colunaValorSecundario]),
            continent: v[0][CONFIG.colunaCategoriaSecundaria]
        }), 
        d => d[CONFIG.colunaCategoriaPrimaria]
    ).map(([country, vals]) => ({
        country, 
        casos: vals.casos, 
        mortes: vals.mortes, 
        continent: vals.continent
    }))
    .filter(d => d.casos > 100 && d.mortes > 10);

    if(aggregated.length === 0) return;

    const margin = {top: 20, right: 120, bottom: 40, left: 60};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // 1. Calcular os limites exatos do gráfico
    const xDomainMin = d3.min(aggregated, d => d.casos) * 0.8;
    const xDomainMax = d3.max(aggregated, d => d.casos) * 1.5;
    const yDomainMin = d3.min(aggregated, d => d.mortes) * 0.8;
    const yDomainMax = d3.max(aggregated, d => d.mortes) * 1.5;

    // 2. Aplicar os limites às Escalas
    const x = d3.scaleLog().domain([xDomainMin, xDomainMax]).range([0, width]);
    const y = d3.scaleLog().domain([yDomainMin, yDomainMax]).range([height, 0]);

    const color = d3.scaleOrdinal(d3.schemeSet2);

    // 3. O FILTRO DE SEGURANÇA: Só mantemos as marcações que cabem dentro do ecrã!
    const tickValuesX = [100, 1000, 10000, 100000, 1000000, 10000000, 100000000]
                        .filter(v => v >= xDomainMin && v <= xDomainMax);
                        
    const tickValuesY = [10, 100, 1000, 10000, 100000, 1000000, 10000000]
                        .filter(v => v >= yDomainMin && v <= yDomainMax);

    // Desenhar Grelhas e Eixos usando apenas os ticks validados
    svg.append("g").attr("class", "grid").attr("transform", `translate(0,${height})`)
       .call(d3.axisBottom(x).tickValues(tickValuesX).tickSize(-height).tickFormat(""));
    svg.append("g").attr("class", "grid")
       .call(d3.axisLeft(y).tickValues(tickValuesY).tickSize(-width).tickFormat(""));

    svg.append("g").attr("transform", `translate(0,${height})`)
       .call(d3.axisBottom(x).tickValues(tickValuesX).tickFormat(d3.format(".2s")));
    svg.append("g")
       .call(d3.axisLeft(y).tickValues(tickValuesY).tickFormat(d3.format(".2s")));

    // Desenhar os pontos
    svg.selectAll(".dot").data(aggregated).enter().append("circle").attr("class", "dot")
        .attr("cx", d => x(d.casos)).attr("cy", d => y(d.mortes))
        .attr("r", 5).attr("fill", d => color(d.continent)).attr("opacity", 0.8)
        .attr("stroke", "#fff").attr("stroke-width", 0.5)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 8).attr("opacity", 1).attr("stroke", "#333");
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`<strong>${d.country} (${d.continent})</strong><br/>Total Casos: ${formatNumber(d.casos)}<br/>Total Mortes: ${formatNumber(d.mortes)}<br/>Letalidade: ${((d.mortes/d.casos)*100).toFixed(2)}%`)
                .style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
        }).on("mouseout", function() {
            d3.select(this).attr("r", 5).attr("opacity", 0.8).attr("stroke", "#fff");
            tooltip.transition().duration(500).style("opacity", 0);
        });

    // Adicionar Legenda
    const continentes = [...new Set(aggregated.map(d => d.continent))].sort();
    const legend = svg.selectAll(".legend").data(continentes).enter().append("g")
        .attr("class", "legend").attr("transform", (d, i) => `translate(${width + 20},${i * 20})`);

    legend.append("rect").attr("x", 0).attr("width", 12).attr("height", 12).style("fill", color);
    legend.append("text").attr("x", 18).attr("y", 6).attr("dy", ".35em")
        .style("text-anchor", "start").style("font-size", "11px").style("fill", "#2c3e50").text(d => d);
}

function drawDataTable(data) {
    const container = d3.select("#tabela-dados");
    container.selectAll("*").remove();
    
    // Tabela: Top 15 Países com mais casos no período
    const aggregated = d3.rollups(data, v => d3.sum(v, d => d[CONFIG.colunaValorPrincipal]), d => d[CONFIG.colunaCategoriaPrimaria])
        .map(([country, casos]) => ({country, casos}))
        .sort((a, b) => d3.descending(a.casos, b.casos))
        .slice(0, 15);

    if(aggregated.length === 0) return;

    const table = container.append("table");
    const thead = table.append("thead");
    const tbody = table.append("tbody");

    thead.append("tr").selectAll("th").data(["País", "Total de Casos"]).enter().append("th").text(d => d);

    const rows = tbody.selectAll("tr").data(aggregated).enter().append("tr");
    rows.append("td").text(d => d.country);
    rows.append("td").text(d => formatNumber(d.casos));
}

function drawBubbleChart(data) {
    const container = d3.select("#chart-bolhas");
    container.selectAll("*").remove();

    let aggregated = d3.rollups(data, 
        v => {
            const casos = d3.sum(v, d => d[CONFIG.colunaValorPrincipal]);
            const pop = d3.max(v, d => d[CONFIG.colunaPop]); 
            const gdp = d3.max(v, d => d[CONFIG.colunaPIB]);
            const continent = v[0][CONFIG.colunaCategoriaSecundaria];
            return { casos, pop, gdp, continent };
        }, 
        d => d[CONFIG.colunaCategoriaPrimaria]
    ).map(([country, vals]) => ({
        country,
        continent: vals.continent,
        gdp: vals.gdp,
        pop: vals.pop,
        casosPorMilhao: vals.pop > 0 ? (vals.casos / vals.pop) * 1000000 : 0
    })).filter(d => d.gdp > 500 && d.casosPorMilhao > 0);

    // Ordenar para os mais pequenos ficarem por cima
    aggregated = aggregated.sort((a, b) => d3.descending(a.pop, b.pop));

    if(aggregated.length === 0) return;

    const margin = {top: 20, right: 120, bottom: 40, left: 60};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // 1. Extrair os limites de segurança reais
    const xDomainMin = d3.min(aggregated, d => d.gdp) * 0.8;
    const xDomainMax = d3.max(aggregated, d => d.gdp) * 1.2;
    const yDomainMax = d3.max(aggregated, d => d.casosPorMilhao) * 1.1;

    // 2. Aplicar Escalas
    const x = d3.scaleLog().domain([xDomainMin, xDomainMax]).range([0, width]);
    const y = d3.scaleLinear().domain([0, yDomainMax]).range([height, 0]);
    
    const z = d3.scaleSqrt().domain([0, d3.max(aggregated, d => d.pop)]).range([3, 45]); 
    const color = d3.scaleOrdinal(d3.schemeSet2);

    // 3. O FILTRO DE SEGURANÇA NO EIXO X (A mesma magia que usaste no outro)
    const tickValuesX = [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000]
                        .filter(v => v >= xDomainMin && v <= xDomainMax);

    // Grelhas usando apenas os valores limpos
    svg.append("g").attr("class", "grid").attr("transform", `translate(0,${height})`)
       .call(d3.axisBottom(x).tickValues(tickValuesX).tickSize(-height).tickFormat(""));
    svg.append("g").attr("class", "grid").call(d3.axisLeft(y).tickSize(-width).tickFormat(""));
    
    // Eixo X formatado
    svg.append("g").attr("transform", `translate(0,${height})`)
       .call(d3.axisBottom(x)
            .tickValues(tickValuesX)
            .tickFormat(d => "$" + d3.format(".2s")(d).replace("G", "B")));
    
    // Eixo Y formatado
    svg.append("g").call(d3.axisLeft(y).tickFormat(d3.format(".2s")));

    // Desenhar Bolhas
    svg.selectAll(".bubble").data(aggregated).enter().append("circle").attr("class", "bubble")
        .attr("cx", d => x(d.gdp)).attr("cy", d => y(d.casosPorMilhao)).attr("r", d => z(d.pop))
        .attr("fill", d => color(d.continent)).attr("opacity", 0.6).attr("stroke", "#333").attr("stroke-width", 1)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 1).attr("stroke-width", 2);
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`<strong>${d.country} (${d.continent})</strong><br/>PIB per capita: $${formatNumber(d.gdp)}<br/>Casos p/ Milhão: ${formatNumber(d.casosPorMilhao)}<br/>População: ${formatNumber(d.pop)}`)
                .style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
        }).on("mouseout", function() {
            d3.select(this).attr("opacity", 0.6).attr("stroke-width", 1);
            tooltip.transition().duration(500).style("opacity", 0);
        });

    // Legenda
    const continentes = [...new Set(aggregated.map(d => d.continent))].sort();
    const legend = svg.selectAll(".legend").data(continentes).enter().append("g")
        .attr("class", "legend").attr("transform", (d, i) => `translate(${width + 20},${i * 20})`);

    legend.append("rect").attr("x", 0).attr("width", 12).attr("height", 12).style("fill", color);
    legend.append("text").attr("x", 18).attr("y", 6).attr("dy", ".35em")
        .style("text-anchor", "start").style("font-size", "11px").style("fill", "#2c3e50").text(d => d);
}

function drawAgeGroupBar(data) {
    const container = d3.select("#chart-idade");
    container.selectAll("*").remove();

    // 1. Somar os totais absolutos por país primeiro
    const countryStats = d3.rollups(data, 
        v => {
            const casos = d3.sum(v, d => d[CONFIG.colunaValorPrincipal]);
            const mortes = d3.sum(v, d => d[CONFIG.colunaValorSecundario]);
            const idade = d3.max(v, d => d[CONFIG.colunaIdade]);
            return { casos, mortes, idade };
        }, 
        d => d[CONFIG.colunaCategoriaPrimaria]
    ).map(([country, vals]) => vals)
     .filter(d => d.idade > 0 && d.casos > 0);

    if(countryStats.length === 0) return;

    // 2. Os novos Escalões Baseados na Demografia Real dos Países
    const grupos = [
        { nome: "Países Jovens (< 25 anos)", totalCasos: 0, totalMortes: 0, cor: "#2ecc71" }, // Verde
        { nome: "Países Adultos (25-40 anos)", totalCasos: 0, totalMortes: 0, cor: "#f1c40f" }, // Amarelo
        { nome: "Países Envelhecidos (> 40 anos)", totalCasos: 0, totalMortes: 0, cor: "#e74c3c" } // Vermelho
    ];

    // 3. A Matemática Justa: Juntar os casos todos no mesmo "balde"
    countryStats.forEach(d => {
        if (d.idade < 25) {
            grupos[0].totalCasos += d.casos;
            grupos[0].totalMortes += d.mortes;
        } else if (d.idade >= 25 && d.idade <= 40) {
            grupos[1].totalCasos += d.casos;
            grupos[1].totalMortes += d.mortes;
        } else {
            grupos[2].totalCasos += d.casos;
            grupos[2].totalMortes += d.mortes;
        }
    });

    // 4. Calcular a Letalidade Global de cada grupo (Mortes / Casos reais)
    const dadosFinais = grupos.map(g => ({
        nome: g.nome,
        // Evitar divisão por zero se o grupo não tiver casos
        mediaLetalidade: g.totalCasos > 0 ? (g.totalMortes / g.totalCasos) * 100 : 0,
        cor: g.cor
    }));

    // 5. Desenhar o Gráfico de Barras
    const margin = {top: 20, right: 40, bottom: 40, left: 190}; // Aumentei a margem esquerda para o texto novo caber
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = container.append("svg").attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(dadosFinais, d => d.mediaLetalidade) * 1.2]).range([0, width]);
    const y = d3.scaleBand().domain(dadosFinais.map(d => d.nome)).range([height, 0]).padding(0.4);

    svg.append("g").attr("class", "grid").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickSize(-height).tickFormat(""));
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(5).tickFormat(d => d.toFixed(1) + "%"));
    svg.append("g").call(d3.axisLeft(y));

    svg.selectAll(".bar").data(dadosFinais).enter().append("rect").attr("class", "bar")
        .attr("y", d => y(d.nome)).attr("height", y.bandwidth())
        .attr("x", 0).attr("width", 0).attr("fill", d => d.cor).attr("rx", 4)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 0.8);
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`<strong>${d.nome}</strong><br/>Letalidade Ponderada: ${d.mediaLetalidade.toFixed(2)}%`)
                .style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
        }).on("mouseout", function() {
            d3.select(this).attr("opacity", 1);
            tooltip.transition().duration(500).style("opacity", 0);
        })
        .transition().duration(1000).attr("width", d => x(d.mediaLetalidade));

    svg.selectAll(".label").data(dadosFinais).enter().append("text")
        .attr("y", d => y(d.nome) + y.bandwidth() / 2 + 4)
        .attr("x", d => x(d.mediaLetalidade) + 5)
        .attr("fill", "#2c3e50").style("font-size", "12px").style("font-weight", "bold")
        .text(d => d.mediaLetalidade.toFixed(2) + "%")
        .attr("opacity", 0).transition().delay(1000).duration(500).attr("opacity", 1);
}

// ==========================================
// 5. RESPONSIVIDADE
// ==========================================
let resizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (currentFilteredData.length > 0) updateDashboard(currentFilteredData);
    }, 200);
});