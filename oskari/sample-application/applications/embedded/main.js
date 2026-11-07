// main starting point
import 'oskari-bundle!oskari-frontend/bundles/framework/mapfull';

// jQuery-based UI components
//  note: old loader
import 'oskari-loader!oskari-frontend/packages/framework/bundle/oskariui/bundle.js';
import 'oskari-loader!oskari-frontend/packages/framework/bundle/ui-components/bundle.js';
import 'oskari-loader!oskari-frontend/packages/framework/bundle/divmanazer/bundle.js';

// 2D mapmodule and support for additional map layer types
import 'oskari-bundle!oskari-frontend/bundles/mapping/mapmodule/map2d_ol';
import 'oskari-bundle!oskari-frontend/bundles/mapping/maparcgis';

// additional map related bundles
import 'oskari-bundle!oskari-frontend/bundles/mapping/infobox';
import 'oskari-bundle!oskari-frontend/bundles/mapping/drawtools';
import 'oskari-bundle!oskari-frontend/bundles/mapping/toolbar';
import 'oskari-bundle!oskari-frontend/bundles/framework/coordinatetool';
import 'oskari-bundle!oskari-frontend/bundles/framework/publishedstatehandler';

// RPC connector
import 'oskari-bundle!oskari-frontend/bundles/framework/rpc';

// bundles that are loaded if the user has selected them to be shown on the embedded map
import 'oskari-lazy-bundle?maprotator!oskari-frontend/bundles/mapping/maprotator';
import 'oskari-lazy-bundle?maplegend!oskari-frontend/bundles/framework/maplegend';
import 'oskari-lazy-bundle?featuredata!oskari-frontend/bundles/framework/featuredata';
import 'oskari-lazy-bundle?statsgrid!oskari-frontend/bundles/statistics/statsgrid';
import 'oskari-lazy-bundle?routingService!oskari-frontend/bundles/framework/routingService';
import 'oskari-lazy-bundle?timeseries!oskari-frontend/bundles/framework/timeseries';
import 'oskari-lazy-bundle?metadataflyout!oskari-frontend/bundles/catalogue/metadataflyout'
import 'oskari-lazy-bundle?metadatasearch!oskari-frontend/bundles/catalogue/metadatasearch';

import './css/overwritten.css';
