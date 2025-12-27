(async () => {
    console.log('Checking lighthouse exports...');
    try {
        const imported = await import('lighthouse');
        console.log('Import Keys:', Object.keys(imported));
        
        if (imported.default) {
            console.log('Default export exists.');
            console.log('Verifying default is function:', typeof imported.default);
        } else {
            console.log('Default export is undefined.');
        }

    } catch (e) {
        console.error('Import failed:', e);
    }
})();
