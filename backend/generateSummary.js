function generateSummary(trends) {
    const summary = [];

    const { temperature, humidity, co2 } = trends;

    const getArrow = (start, end) => (end > start ? '↯' : '↯');

    const getTemperatureRecommendation = (average) => {
        if (average > 30) return '🔥 Too hot. Increase ventilation or shading.';
        if (average < 20) return '❄️ Too cold. Consider heating.';
        return '✅ Temperature is optimal.';
    };

    const getHumidityRecommendation = (average) => {
        if (average > 70) return '💧 High humidity. Increase ventilation.';
        if (average < 50) return '🌬️ Low humidity. Add water.';
        return '✅ Humidity is optimal.';
    };

    const getCO2Recommendation = (average) => {
        if (average > 1000) return '🚨 High CO₂ levels. Ventilate the greenhouse.';
        if (average < 400) return '🌿 Low CO₂ levels. Consider adding CO₂.';
        return '✅ CO₂ levels are optimal.';
    };

    const round = (value) =>
        value !== undefined && value !== null
            ? Math.round(value * 10) / 10
            : null;

    summary.push({
        title: 'Daily Temperature :',
        data: `${round(temperature.start)}°C ${getArrow(temperature.start, temperature.end)} ${round(temperature.end)}°C`,
        overallTitle: 'Overall Avg :',
        overallAverage: `${round(temperature.overall_average)}°C`,
        variability: temperature.variability,
        recommendation: getTemperatureRecommendation(temperature.average),
    });

    summary.push({
        title: 'Daily Humidity :',
        data: `${round(humidity.start)}% ${getArrow(humidity.start, humidity.end)} ${round(humidity.end)}%`,
        overallTitle: 'Overall Avg :',
        overallAverage: `${round(humidity.overall_average)}%`,
        variability: humidity.variability,
        recommendation: getHumidityRecommendation(humidity.average),
    });

    summary.push({
        title: 'Daily CO₂ :',
        data: `${round(co2.start)}ppm ${getArrow(co2.start, co2.end)} ${round(co2.end)}ppm`,
        overallTitle: 'Overall Avg :',
        overallAverage: `${round(co2.overall_average)}ppm`,
        variability: co2.variability,
        recommendation: getCO2Recommendation(co2.average),
    });

    return summary;
}


// Lire les données depuis stdin
let input = '';
process.stdin.on('data', (chunk) => {
    input += chunk;
});

process.stdin.on('end', () => {
    try {
        const trends = JSON.parse(input); // Parse les données JSON
        console.log(JSON.stringify(generateSummary(trends))); // Génère et affiche le tableau JSON
    } catch (error) {
        console.error("Invalid JSON input:", error.message);
        process.exit(1); // Quitte avec un code d'erreur
    }
});

module.exports = generateSummary;