// Token supprimé pour sécurité (géré côté serveur via variable d'environnement ENEDIS_TOKEN)

const LOGEMENT_1 = {
    id: "16185528047969", label: "Balguerie", colorBase: "#38bdf8", kpiElem: "kpi-1", costElem: "cost-1", chartId: "consoChart1",
    subscriptionMonth: 15.65,
    rateBase: null,
    rateHC: 0.1287,
    rateHP: 0.1657,
    isHCHP: true,
    colorHC: "#34d399", // Green
    colorHP: "#f87171", // Red
    colorAbo: "#facc15" // Yellow/Gold representing Abo part
};
const LOGEMENT_2 = {
    id: "17566859598256", label: "La bicoque", colorBase: "#818cf8", kpiElem: "kpi-2", costElem: "cost-2", chartId: "consoChart2",
    subscriptionMonth: 19.56,
    rateBase: 0.1551,
    rateHC: null, rateHP: null,
    isHCHP: false,
    colorBase: "#818cf8",
    colorAbo: "#facc15"
};

const PRMS = [LOGEMENT_1, LOGEMENT_2];
let chartInstances = {};
let currentRange = 'month';
let currentOffset = 0; // 0 = current, 1 = previous etc.

// Formatage de date locale sans passer par UTC (évite le décalage CET/UTC)
const fmtDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

// Ranges configuration
const RANGES = {
    day: {
        api: 'consumption_load_curve', days: 1,
        getDates: (offset) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const start = new Date(today);
            start.setDate(start.getDate() - 1 - offset);
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            return {
                start: fmtDate(start),
                end: fmtDate(end),
                days: 1,
                label: start.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            };
        }
    },
    week: {
        api: 'consumption_load_curve', days: 7,
        getDates: (offset) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const end = new Date(today);
            end.setDate(end.getDate() - (offset * 7));
            const start = new Date(end);
            start.setDate(start.getDate() - 7);
            const endDisplay = new Date(end);
            endDisplay.setDate(endDisplay.getDate() - 1);
            return {
                start: fmtDate(start),
                end: fmtDate(end),
                days: 7,
                label: `Du ${start.toLocaleDateString('fr-FR')} au ${endDisplay.toLocaleDateString('fr-FR')}`
            };
        }
    },
    month: {
        api: 'daily_consumption', days: 30,
        getDates: (offset) => {
            const today = new Date();
            const start = new Date(today.getFullYear(), today.getMonth() - offset, 1);
            let end = new Date(today.getFullYear(), today.getMonth() - offset + 1, 1);
            if (end > today) end = today;
            const daysInMonth = new Date(today.getFullYear(), today.getMonth() - offset + 1, 0).getDate();
            return {
                start: fmtDate(start),
                end: fmtDate(end),
                days: daysInMonth,
                label: start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
            };
        }
    },
    year: {
        api: 'daily_consumption', days: 365,
        getDates: (offset) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const end = new Date(today);
            end.setFullYear(end.getFullYear() - offset);
            const start = new Date(end);
            start.setFullYear(start.getFullYear() - 1);
            const endDisplay = new Date(end);
            endDisplay.setDate(endDisplay.getDate() - 1);
            return {
                start: fmtDate(start),
                end: fmtDate(end),
                days: 365,
                label: `Du ${start.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })} au ${endDisplay.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`
            };
        }
    }
};

const isHeureCreuse = (dateStr) => {
    const d = new Date(dateStr);
    const hour = d.getHours();
    return hour >= 22 || hour < 6;
};

const fetchData = async (prm, rangeType, offset) => {
    const config = RANGES[rangeType];
    const { start, end } = config.getDates(offset);
    const url = `/api/${config.api}?prm=${prm}&start=${start}&end=${end}`;

    // Système de mise en cache via sessionStorage (mémoire du navigateur)
    // Permet de ne pas harceler l'API Enedis si on navigue ou qu'on rafraîchit la page
    const cacheKey = `enedis_cache_${prm}_${config.api}_${start}_${end}`;
    const cachedData = sessionStorage.getItem(cacheKey);

    if (cachedData) {
        console.log(`Données récupérées depuis le cache local pour ${prm} (${start})`);
        return { prm, data: JSON.parse(cachedData), error: null };
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
        const data = await response.json();

        // Sauvegarde dans le cache si c'est un succès (et pas une erreur de l'API encapsulée dans le JSON 200)
        if (!data.error) {
            sessionStorage.setItem(cacheKey, JSON.stringify(data));
        }

        return { prm, data, error: null };
    } catch (error) {
        console.error(`Erreur pour le PRM ${prm}:`, error);
        return { prm, data: null, error: error.message };
    }
};

const initDashboard = async (range, offset) => {
    currentRange = range;
    currentOffset = offset;

    document.getElementById('loading').style.display = 'block';
    const errorContainer = document.getElementById('error-message');
    errorContainer.style.display = 'none';

    document.getElementById('chart-card-1').style.display = 'none';
    document.getElementById('chart-card-2').style.display = 'none';

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.range === range);
    });

    document.getElementById('next-btn').disabled = offset === 0;
    document.getElementById('next-btn').style.opacity = offset === 0 ? "0.3" : "1";

    const config = RANGES[range];
    const datesInfo = config.getDates(offset);
    document.getElementById('current-date-display').innerText = datesInfo.label.charAt(0).toUpperCase() + datesInfo.label.slice(1);

    const results = await Promise.all(PRMS.map(p => fetchData(p.id, range, offset)));
    let allErrors = [];

    results.forEach((result, index) => {
        const logement = PRMS[index];
        const kpiElem = document.getElementById(logement.kpiElem);
        const costElem = document.getElementById(logement.costElem);

        const msgElem = document.getElementById(`msg-${index + 1}`);

        if (result.error || !result.data || !result.data.interval_reading || result.data.interval_reading.length === 0) {
            kpiElem.innerText = "-";
            costElem.innerText = "-";
            if (msgElem) msgElem.innerText = "Données indisponibles (logement non acquis à cette période ?)";

            if (result.error && !result.error.includes("400")) allErrors.push(`${logement.label}: ${result.error}`);
            if (result.data && result.data.error) allErrors.push(`${logement.label}: ${result.data.error.error_description || result.data.error}`);
            return;
        }

        if (msgElem) msgElem.innerText = "";

        document.getElementById(`chart-card-${index + 1}`).style.display = 'block';
        let readings = result.data.interval_reading;

        // Calculs exacts par point:
        const dailyAboCost = logement.subscriptionMonth / 30; // Coût exact pour 1 journée (24h)
        let aboCostPerPoint = dailyAboCost; // Par défaut (pour 'daily_consumption' où 1 point = 1 jour)

        let intervalFractionH = 1; // fraction d'heure par défaut

        if (config.api === 'consumption_load_curve' && readings.length > 0) {
            // Lecture de la durée réelle d'un point dans l'API Enedis (15m ou 30m)
            const interval = readings[0].interval_length; // ex: "PT15M"
            let pointsPerDay = 48; // par défaut 30m
            if (interval === "PT15M") { pointsPerDay = 96; intervalFractionH = 0.25; }
            else if (interval === "PT30M") { pointsPerDay = 48; intervalFractionH = 0.5; }
            else if (interval === "PT60M") { pointsPerDay = 24; intervalFractionH = 1; }

            aboCostPerPoint = dailyAboCost / pointsPerDay; // On divise la journée en X points
        }

        const processedPoints = readings.map(r => {
            const dateStr = r.date;
            const rawValue = parseInt(r.value, 10) || 0;
            let kwh = 0;

            if (config.api === 'consumption_load_curve') {
                // Courbe de charge : valeur moyenne en Watts sur l'intervalle.
                // Énergie (Wh) = Puissance (W) * temps (h)
                kwh = (rawValue * intervalFractionH) / 1000;
            } else {
                // daily_consumption : valeur directement en Wh.
                kwh = rawValue / 1000;
            }

            const aboCost = aboCostPerPoint;

            let hcKwh = 0, hpKwh = 0, baseKwh = 0;
            let hcCost = 0, hpCost = 0, baseCost = 0;

            if (logement.isHCHP) {
                if (range === 'day' || range === 'week') {
                    if (isHeureCreuse(dateStr)) {
                        hcKwh = kwh; hcCost = kwh * logement.rateHC;
                    } else {
                        hpKwh = kwh; hpCost = kwh * logement.rateHP;
                    }
                } else {
                    hcKwh = kwh * 0.33; hcCost = hcKwh * logement.rateHC;
                    hpKwh = kwh * 0.67; hpCost = hpKwh * logement.rateHP;
                }
            } else {
                baseKwh = kwh; baseCost = kwh * logement.rateBase;
            }

            return { dateStr, aboCost, hcCost, hpCost, baseCost, hcKwh, hpKwh, baseKwh };
        });

        // Groupage si annee ou semaine (car semaine est desormais en points 30min)
        let finalPoints = processedPoints;
        if (range === 'year' || range === 'week') {
            const groupMap = {};
            processedPoints.forEach(p => {
                const isYear = range === 'year';
                // Year => group by YYYY-MM. Week => group by YYYY-MM-DD
                let groupKey = p.dateStr.split(' ')[0]; // par defaut YYYY-MM-DD pour Week

                if (!isYear && p.dateStr.endsWith("00:00:00") && p.dateStr.includes(" ")) {
                    // Les données à 00:00 correspondent à la toute fin du jour précédent dans la "load curve"
                    const parts = groupKey.split('-');
                    let d = new Date(parts[0], parts[1] - 1, parts[2]);
                    d.setDate(d.getDate() - 1);
                    groupKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                }

                if (isYear) {
                    const d = new Date(p.dateStr);
                    groupKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                }

                if (!groupMap[groupKey]) {
                    groupMap[groupKey] = { dateStr: groupKey, aboCost: 0, hcCost: 0, hpCost: 0, baseCost: 0, hcKwh: 0, hpKwh: 0, baseKwh: 0 };
                }
                const pt = groupMap[groupKey];
                pt.aboCost += p.aboCost; pt.hcCost += p.hcCost; pt.hpCost += p.hpCost; pt.baseCost += p.baseCost;
                pt.hcKwh += p.hcKwh; pt.hpKwh += p.hpKwh; pt.baseKwh += p.baseKwh;
            });
            finalPoints = Object.keys(groupMap).sort().map(k => groupMap[k]);
        }

        const labels = finalPoints.map(p => p.dateStr);

        let totalValKwh = 0;
        let totalValCost = 0;

        finalPoints.forEach(p => {
            totalValKwh += p.hcKwh + p.hpKwh + p.baseKwh;
            totalValCost += p.aboCost + p.hcCost + p.hpCost + p.baseCost;
        });

        kpiElem.innerText = totalValKwh.toFixed(1);
        costElem.innerText = totalValCost.toFixed(2);

        const detElem = document.getElementById('hc-hp-details');
        if (logement.isHCHP && detElem && index === 0) {
            let tHcKwh = 0, tHpKwh = 0;
            let tHcCost = 0, tHpCost = 0;
            finalPoints.forEach(p => {
                tHcKwh += p.hcKwh; tHpKwh += p.hpKwh;
                tHcCost += p.hcCost; tHpCost += p.hpCost;
            });
            const totalHCHPKwh = tHcKwh + tHpKwh;
            const pctHc = totalHCHPKwh > 0 ? ((tHcKwh / totalHCHPKwh) * 100).toFixed(1) : 0;
            const pctHp = totalHCHPKwh > 0 ? (100 - pctHc).toFixed(1) : 0;

            detElem.innerHTML = `HC : ${tHcKwh.toFixed(1)} kWh (${tHcCost.toFixed(2)}€) - <strong>${pctHc}%</strong>  |  HP : ${tHpKwh.toFixed(1)} kWh (${tHpCost.toFixed(2)}€) - <strong>${pctHp}%</strong>`;
        } else if (detElem && index === 0) {
            detElem.innerHTML = "";
        }

        const datasets = [];

        // Push Abonnement first (bottom of stack)
        datasets.push({
            label: "Abonnement",
            data: finalPoints.map(p => p.aboCost),
            backgroundColor: logement.colorAbo,
            kwhData: finalPoints.map(p => 0)
        });

        if (logement.isHCHP) {
            datasets.push({
                label: "Heures Creuses",
                data: finalPoints.map(p => p.hcCost),
                backgroundColor: logement.colorHC || '#34d399',
                kwhData: finalPoints.map(p => p.hcKwh)
            });
            datasets.push({
                label: "Heures Pleines",
                data: finalPoints.map(p => p.hpCost),
                backgroundColor: logement.colorHP || '#f87171',
                kwhData: finalPoints.map(p => p.hpKwh)
            });
        } else {
            datasets.push({
                label: "Conso Base",
                data: finalPoints.map(p => p.baseCost),
                backgroundColor: logement.colorBase,
                kwhData: finalPoints.map(p => p.baseKwh)
            });
        }

        renderChart(logement, labels, datasets, range);
    });

    document.getElementById('loading').style.display = 'none';

    if (allErrors.length > 0) {
        errorContainer.style.display = 'block';
        errorContainer.innerHTML = '<strong>Avertissement ou absence de données :</strong><br>' + allErrors.join('<br>');
    }
};

const renderChart = (logement, labels, datasets, range) => {
    const ctx = document.getElementById(logement.chartId).getContext('2d');

    // Ajustement de la largeur pour le scroll horizontal
    // Plus il y a de barres (ex: Mois = 30-31), plus le conteneur doit être large
    const wrapperId = logement.chartId.replace('consoChart', 'chart-wrapper-');
    const wrapper = document.getElementById(wrapperId);
    if (wrapper) {
        let pixelsPerBar = 30; // Largeur de base par bâton (incluant l'espace)
        if (range === 'month') pixelsPerBar = 35; // Plus large pour le mois (textes des jours)
        if (range === 'day') pixelsPerBar = 20; // Plus fin pour la journée (48 batons de 30min)
        if (range === 'week') pixelsPerBar = 70; // Très large pour la semaine
        if (range === 'year') pixelsPerBar = 60; // Très large pour l'année

        const minWidth = labels.length * pixelsPerBar;
        wrapper.style.minWidth = `max(100%, ${minWidth}px)`;
    }

    const formattedLabels = labels.map(dateStr => {
        // Parsing manuel pour éviter tout décalage UTC vs heure locale
        let d;
        if (dateStr.length === 7) { // YYYY-MM
            const [y, m] = dateStr.split('-').map(Number);
            d = new Date(y, m - 1, 15);
        } else if (dateStr.length === 10) { // YYYY-MM-DD
            const [y, m, day] = dateStr.split('-').map(Number);
            d = new Date(y, m - 1, day);
        } else { // YYYY-MM-DD HH:MM:SS (load curve)
            d = new Date(dateStr);
        }

        if (range === 'day') return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        if (range === 'year') return d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    });

    if (chartInstances[logement.id]) {
        chartInstances[logement.id].destroy();
    }

    chartInstances[logement.id] = new Chart(ctx, {
        type: 'bar', // Always bar to support stacking properly for amounts
        data: {
            labels: formattedLabels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#f8fafc', font: { family: 'Inter', size: 13 } } },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { family: 'Inter', size: 14 },
                    bodyFont: { family: 'Inter', size: 14 },
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            const cost = context.raw;
                            const kwh = context.dataset.kwhData[context.dataIndex];
                            if (context.dataset.label === "Abonnement") {
                                return `Abonnement : ${cost.toFixed(2)} €`;
                            }

                            let text = `${context.dataset.label} : ${cost.toFixed(2)} € (${kwh.toFixed(2)} kWh)`;

                            // Calcul du pourcentage pour HC ou HP
                            if (context.dataset.label === "Heures Creuses" || context.dataset.label === "Heures Pleines") {
                                const allDatasets = context.chart.data.datasets;
                                let pointTotalKwh = 0;
                                allDatasets.forEach(ds => {
                                    if (ds.kwhData) {
                                        pointTotalKwh += ds.kwhData[context.dataIndex];
                                    }
                                });

                                if (pointTotalKwh > 0) {
                                    const pct = (kwh / pointTotalKwh * 100).toFixed(1);
                                    text += ` -> ${pct}%`;
                                }
                            }
                            return text;
                        },
                        footer: function (tooltipItems) {
                            let totalCost = 0;
                            let totalKwh = 0;
                            const dataIndex = tooltipItems[0].dataIndex;
                            const chart = tooltipItems[0].chart;

                            chart.data.datasets.forEach(ds => {
                                if (ds.data[dataIndex]) totalCost += ds.data[dataIndex];
                                if (ds.kwhData && ds.kwhData[dataIndex]) totalKwh += ds.kwhData[dataIndex];
                            });

                            return `\nTotal cumulé : ${totalCost.toFixed(2)} € (${totalKwh.toFixed(2)} kWh)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8', font: { family: 'Inter' }, maxTicksLimit: 12 }
                },
                y: {
                    stacked: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8', font: { family: 'Inter' } },
                    title: { display: true, text: 'Coût (€)', color: '#94a3b8' }
                }
            }
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const range = e.target.dataset.range;
            if (range !== currentRange) {
                initDashboard(range, 0); // Reset offset when changing range
            }
        });
    });

    document.getElementById('prev-btn').addEventListener('click', () => {
        initDashboard(currentRange, currentOffset + 1);
    });

    document.getElementById('next-btn').addEventListener('click', () => {
        if (currentOffset > 0) initDashboard(currentRange, currentOffset - 1);
    });

    initDashboard('month', 0);
});
