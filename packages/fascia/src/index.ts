import '../styles/index.css';

import { registerFasciaHooks } from './registerFasciaHooks.js';

export { FasciaApp }   from './FasciaApp.js';
export { withFascia }  from './withFascia.js';
export { registerPartials } from './registerPartials.js';

registerFasciaHooks();
