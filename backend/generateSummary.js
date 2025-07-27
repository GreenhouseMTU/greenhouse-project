const { NlgLib } = require('rosaenlg');

function generateSummary(trends) {
    const nlg = new NlgLib({ language: 'en_US' });

    const summary = [];

    const { temperature, humidity, co2 } = trends;

    // Fonction pour déterminer la flèche 
    const getArrow = (start, end) => (end > start ? '↯' : '↯');


    // Recommendations based on greenhouse thresholds
    const getTemperatureRecommendation = (overallAverage) => {
        if (overallAverage > 30) return '🌡️ Too hot. Increase ventilation or shading.';
        if (overallAverage < 20) return '🔥 Too cold. Consider heating.';
        return '👍 Temperature is optimal.';
    };


    const getHumidityRecommendation = (overallAverage) => {
        if (overallAverage > 70) return '💧 High humidity. Increase ventilation.';
        if (overallAverage < 50) return '🌬️ Low humidity. Add water.';
        return '👍 Humidity is optimal.';
    };



    const getCO2Recommendation = (overallAverage) => {
        if (overallAverage > 1000) return '🫁 High CO₂ levels. Ventilate the greenhouse.';
        if (overallAverage < 400) return '🌿 Low CO₂ levels. Consider adding CO₂.';
        return '👍 CO₂ levels are optimal.';
    };

    // Température
    summary.push({
        title: 'Daily Temperature :',
        data: `${temperature.start}°C ${getArrow(temperature.start, temperature.end)} ${temperature.end}°C `,
        overallTitle: 'Overall Avg :',
        overallData: `${temperature.overall_average}°C (${temperature.variability})`,
        recommendation: getTemperatureRecommendation(temperature.overall_average) // Utilisation de overall_average
    });

    // Humidité
    summary.push({
        title: 'Daily Humidity :',
        data: `${humidity.start}% ${getArrow(humidity.start, humidity.end)} ${humidity.end}%`,
        overallTitle: 'Overall Avg :',
        overallData: `${humidity.overall_average}% (${humidity.variability})`,
        recommendation: getHumidityRecommendation(humidity.overall_average) // Utilisation de overall_average
    });

    // CO2
    summary.push({
        title: 'Daily CO₂ :',
        data: `${co2.start}ppm ${getArrow(co2.start, co2.end)} ${co2.end}ppm`,
        overallTitle: 'Overall Avg :',
        overallData: `${co2.overall_average}ppm (${co2.variability})`,
        recommendation: getCO2Recommendation(co2.overall_average) // Utilisation de overall_average
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