/**
 * Carbon Calculator
 * Based on the Sustainable Web Design model.
 */

// 1 byte = X kWh?
// The model: 0.81 kWh / GB for data transfer (2021/2022 estimate)
// Carbon intensity: ~442g/kWh (global average)
// 
// Formula:
// Energy = (Data Transfer (GB) * 0.81) * 0.75 (system boundary)
// Carbon = Energy * 442g

const SWD_KWH_PER_GB = 0.81;
const CARBON_INTENSITY_GLOBAL = 442; // g/kWh

/**
 * Checks if a domain is hosted on green infrastructure.
 * @param {string} domain 
 * @returns {Promise<boolean>}
 */
async function checkGreenHosting(domain) {
    try {
        const res = await fetch(`https://api.thegreenwebfoundation.org/greencheck/${domain}`);
        const data = await res.json();
        return data.green || false;
    } catch (e) {
        console.warn('Green hosting check failed:', e.message);
        return false;
    }
}

/**
 * Calculates the carbon footprint of a page load.
 * @param {number} bytes - Total transfer size in bytes.
 * @param {boolean} isGreen - Whether the host is green.
 * @returns {object} - { co2: number (grams), rating: string }
 */
function calculateCarbon(bytes, isGreen) {
    const gb = bytes / (1024 * 1024 * 1024);
    let energy = gb * SWD_KWH_PER_GB * 0.75; // kWh
    
    // Carbon intensity adjustment
    // If green, we assume a lower intensity or offset (often considered 0 or low, but let's say 50g/kWh for production/network overhead)
    // The standard generally keeps network intensity the same but reduced datacenter intensity.
    // For simplicity/standard SWD: Green hosting reduces the data center portion.
    // Let's use simple factor: if green, reduce total by 10-20%? 
    // Actually, SWD v3 splits it:
    // Consumer device: 52%
    // Network: 14%
    // Data Center: 15%
    // Hardware production: 19%
    // 
    // Green hosting only affects Data Center (15%).
    // So if green, we assume 0 emissions for that 15%, reducing total by 15%.
    
    const intensity = isGreen ? CARBON_INTENSITY_GLOBAL * 0.85 : CARBON_INTENSITY_GLOBAL;
    
    const co2 = energy * intensity;
    
    // Rating (Eco-Index style)
    // < 0.5g -> A+
    // < 1g -> A
    // < 2g -> B
    // < 3g -> C
    // > 5g -> F
    let rating = 'F';
    if(co2 < 0.5) rating = 'A+';
    else if(co2 < 1.0) rating = 'A';
    else if(co2 < 2.0) rating = 'B';
    else if(co2 < 3.0) rating = 'C';
    else if(co2 < 4.0) rating = 'D';
    else if(co2 < 5.0) rating = 'E';

    return {
        co2: parseFloat(co2.toFixed(3)),
        rating,
        energy: parseFloat(energy.toFixed(5))
    };
}

module.exports = { checkGreenHosting, calculateCarbon };
