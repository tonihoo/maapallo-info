// main starting point
import 'oskari-bundle!oskari-frontend/bundles/framework/mapfull';

// jQuery-based UI components
//  note: old loader
import 'oskari-loader!oskari-frontend/packages/framework/bundle/oskariui/bundle.js';
import 'oskari-loader!oskari-frontend/packages/framework/bundle/ui-components/bundle.js';
import 'oskari-loader!oskari-frontend/packages/framework/bundle/divmanazer/bundle.js';

// 3D mapmodule and support for additional map layer types
import 'oskari-bundle!oskari-frontend/bundles/mapping/mapmodule/map3d_olcs';
import 'oskari-bundle!oskari-frontend/bundles/mapping/tiles3d';
import 'oskari-bundle!oskari-frontend/bundles/mapping/maparcgis';

// additional map related bundles
import 'oskari-bundle!oskari-frontend/bundles/mapping/infobox';
import 'oskari-bundle!oskari-frontend/bundles/mapping/drawtools';
import 'oskari-bundle!oskari-frontend/bundles/mapping/toolbar';
import 'oskari-bundle!oskari-frontend/bundles/framework/coordinatetool';
import 'oskari-bundle!oskari-frontend/bundles/framework/publishedstatehandler';
// 3D related bundles
import 'oskari-bundle!oskari-frontend/bundles/mapping/time-control-3d';
import 'oskari-bundle!oskari-frontend/bundles/mapping/camera-controls-3d';

// RPC connector
import 'oskari-bundle!oskari-frontend/bundles/framework/rpc';

// bundles that are loaded if the user has selected them to be shown on the embedded map
import 'oskari-lazy-bundle?maprotator!oskari-frontend/bundles/mapping/maprotator';
import 'oskari-lazy-bundle?maplegend!oskari-frontend/bundles/framework/maplegend';
import 'oskari-lazy-bundle?featuredata!oskari-frontend/bundles/framework/featuredata';
import 'oskari-lazy-bundle?statsgrid!oskari-frontend/bundles/statistics/statsgrid';
import 'oskari-lazy-bundle?routingService!oskari-frontend/bundles/framework/routingService';

import './css/overwritten.css';
