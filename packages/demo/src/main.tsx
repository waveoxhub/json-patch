import React from 'react';
import ReactDOM from 'react-dom/client';
import { loader } from '@monaco-editor/react';
import App from './App';
import '@src/styles/app.css';
import { schemaJsonPatchSchema, SCHEMA_JSON_PATCH_SCHEMA_URI } from './schemas/schemaJsonPatchSchema';

// 配置 Monaco Editor 的 JSON Schema 验证
loader.init().then(monaco => {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        schemas: [
            {
                uri: SCHEMA_JSON_PATCH_SCHEMA_URI,
                fileMatch: ['schema*.json', '*schema.json'],
                schema: schemaJsonPatchSchema,
            },
        ],
        allowComments: false,
        schemaValidation: 'error',
    });
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
