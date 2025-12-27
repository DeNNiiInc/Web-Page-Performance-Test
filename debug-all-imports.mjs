(async () => {
    console.log('--- DEBUG IMPORTS ---');
    
    try {
        console.log('Importing check: lighthouse');
        const lighthouse = await import('lighthouse');
        console.log('Lighthouse keys:', Object.keys(lighthouse));
        console.log('Lighthouse Default type:', typeof lighthouse.default);

        console.log('Importing check: chrome-launcher');
        const chromeLauncher = await import('chrome-launcher');
        console.log('ChromeLauncher keys:', Object.keys(chromeLauncher));
        console.log('ChromeLauncher Default type:', typeof chromeLauncher.default);
        console.log('ChromeLauncher Launch type:', typeof chromeLauncher.launch);

        console.log('Importing check: uuid');
        const uuid = await import('uuid');
        console.log('UUID keys:', Object.keys(uuid));
        console.log('UUID v4 type:', typeof uuid.v4);
        console.log('UUID default type:', typeof uuid.default);

    } catch (e) {
        console.error('CRITICAL IMPORT FAILURE:', e);
    }
    console.log('--- END DEBUG ---');
})();
