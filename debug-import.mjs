(async () => {
    console.log('Checking chrome-launcher exports...');
    try {
        const imported = await import('chrome-launcher');
        console.log('Import Keys:', Object.keys(imported));
        
        if (imported.default) {
            console.log('Default export exists.');
            console.log('Default keys:', Object.keys(imported.default));
            if (typeof imported.default.launch === 'function') {
                console.log('VERDICT: imported.default.launch is a function. (OK for Default Import)');
            } else {
                console.log('VERDICT: imported.default.launch is NOT a function.');
            }
        } else {
            console.log('Default export is undefined.');
        }

        if (typeof imported.launch === 'function') {
            console.log('VERDICT: imported.launch is a function. (Use Named Import)');
        }

    } catch (e) {
        console.error('Import failed:', e);
    }
})();
