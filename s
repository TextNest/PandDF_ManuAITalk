[1mdiff --cc .gitignore[m
[1mindex e882a912,9a752135..00000000[m
[1m--- a/.gitignore[m
[1m+++ b/.gitignore[m
[1mdiff --git a/Full/Frontend/src/app/(user)/simulation/[productId]/page.tsx b/Full/Frontend/src/app/(user)/simulation/[productId]/page.tsx[m
[1mindex 88993f29..60dc5944 100644[m
[1m--- a/Full/Frontend/src/app/(user)/simulation/[productId]/page.tsx[m
[1m+++ b/Full/Frontend/src/app/(user)/simulation/[productId]/page.tsx[m
[36m@@ -19,6 +19,21 @@[m [mexport default function SimulationPage() {[m
   const { isARActive, setARActive } = useARStore();[m
   const [product, setProduct] = useState<Product | null>(null);[m
   const [error, setError] = useState<string | null>(null);[m
[32m+[m[32m  const [isARSupported, setIsARSupported] = useState(false);[m
[32m+[m[32m  const [arSupportChecked, setArSupportChecked] = useState(false);[m
[32m+[m
[32m+[m[32m  useEffect(() => {[m
[32m+[m[32m    const checkARSupport = async () => {[m
[32m+[m[32m      if (!('xr' in navigator)) {[m
[32m+[m[32m        setIsARSupported(false);[m
[32m+[m[32m      } else {[m
[32m+[m[32m        const supported = await (navigator as any).xr.isSessionSupported('immersive-ar');[m
[32m+[m[32m        setIsARSupported(supported);[m
[32m+[m[32m      }[m
[32m+[m[32m      setArSupportChecked(true);[m
[32m+[m[32m    };[m
[32m+[m[32m    checkARSupport();[m
[32m+[m[32m  }, []);[m
 [m
   const arSceneRef = useRef<ARSceneHandle>(null);[m
   const uiOverlayRef = useRef<HTMLDivElement>(null);[m
[36m@@ -83,7 +98,7 @@[m [mexport default function SimulationPage() {[m
           <Move3d size={24} className={styles.headerIcon} />[m
           <div>[m
             <h1>공간 시뮬레이션</h1>[m
[31m-            <p>제품: {product ? product.name : productId}</p>[m
[32m+[m[32m            <p>제품: {product ? product.product_name : productId}</p>[m
           </div>[m
         </div>[m
       </header>[m
[36m@@ -118,9 +133,19 @@[m [mexport default function SimulationPage() {[m
               <p>실제 AR/3D 로직은 별도 컴포넌트로 구현하여 이 영역에 삽입하면 됩니다.</p>[m
             </div>[m
 [m
[31m-            <button className={styles.arButton} onClick={handleStartAR}>[m
[32m+[m[32m            <button[m
[32m+[m[32m              className={styles.arButton}[m
[32m+[m[32m              onClick={handleStartAR}[m
[32m+[m[32m              disabled={!arSupportChecked || !isARSupported}[m
[32m+[m[32m            >[m
               AR 기능 시작[m
             </button>[m
[32m+[m[32m            {!arSupportChecked && ([m
[32m+[m[32m              <p className={styles.arSupportMessage}>AR 지원 여부 확인 중...</p>[m
[32m+[m[32m            )}[m
[32m+[m[32m            {arSupportChecked && !isARSupported && ([m
[32m+[m[32m              <p className={styles.arSupportMessage}>이 기기에서는 AR 기능을 지원하지 않습니다.</p>[m
[32m+[m[32m            )}[m
           </div>[m
         </div>[m
 [m
[36m@@ -132,11 +157,11 @@[m [mexport default function SimulationPage() {[m
               <>[m
                 <div className={styles.infoItem}>[m
                   <span className={styles.label}>제품명:</span>[m
[31m-                  <span className={styles.value}>{product.name}</span>[m
[32m+[m[32m                  <span className={styles.value}>{product.product_name}</span>[m
                 </div>[m
                 <div className={styles.infoItem}>[m
                   <span className={styles.label}>모델명:</span>[m
[31m-                  <span className={styles.value}>{product.model}</span>[m
[32m+[m[32m                  <span className={styles.value}>{product.product_id}</span>[m
                 </div>[m
                 <div className={styles.infoItem}>[m
                   <span className={styles.label}>규격 (W x H x D):</span>[m
[1mdiff --git a/Full/Frontend/src/app/(user)/simulation/[productId]/simulation-page.module.css b/Full/Frontend/src/app/(user)/simulation/[productId]/simulation-page.module.css[m
[1mindex 9be76d0a..5543f586 100644[m
[1m--- a/Full/Frontend/src/app/(user)/simulation/[productId]/simulation-page.module.css[m
[1m+++ b/Full/Frontend/src/app/(user)/simulation/[productId]/simulation-page.module.css[m
[36m@@ -207,6 +207,18 @@[m
   background-color: #5a67d8;[m
 }[m
 [m
[32m+[m[32m.arButton:disabled {[m
[32m+[m[32m  background-color: #cccccc;[m
[32m+[m[32m  cursor: not-allowed;[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.arSupportMessage {[m
[32m+[m[32m  margin-top: 1rem;[m
[32m+[m[32m  font-size: 0.9rem;[m
[32m+[m[32m  color: #d32f2f; /* Red color for error/warning */[m
[32m+[m[32m  font-weight: 500;[m
[32m+[m[32m}[m
[32m+[m
 .arSceneWrapper {[m
   display: none;[m
   width: 100%;[m
[1mdiff --git a/Full/Frontend/src/app/api/ar/furniture/route.ts b/Full/Frontend/src/app/api/ar/furniture/route.ts[m
[1mindex d6a156cf..50df86b1 100644[m
[1m--- a/Full/Frontend/src/app/api/ar/furniture/route.ts[m
[1m+++ b/Full/Frontend/src/app/api/ar/furniture/route.ts[m
[36m@@ -5,7 +5,7 @@[m [mimport pool from '@/lib/ar/db';[m
 export async function GET() {[m
   try {[m
     const connection = await pool.getConnection();[m
[31m-    const [rows] = await connection.query('SELECT id, name, width, depth, height, modelurl as modelUrl FROM dohun');[m
[32m+[m[32m    const [rows] = await connection.query('SELECT product_id as id, product_name as name, width_mm as width, depth_mm as depth, height_mm as height, model3d_url as modelUrl FROM test_products');[m
     connection.release();[m
     return NextResponse.json(rows);[m
   } catch (error) {[m
[1mdiff --git a/Full/Frontend/src/components/ar/ARScene.tsx b/Full/Frontend/src/components/ar/ARScene.tsx[m
[1mindex 81801190..7921d8d1 100644[m
[1m--- a/Full/Frontend/src/components/ar/ARScene.tsx[m
[1m+++ b/Full/Frontend/src/components/ar/ARScene.tsx[m
[36m@@ -60,8 +60,8 @@[m [mconst ARScene = forwardRef<ARSceneHandle, ARSceneProps>(({ uiOverlayRef, lastUIT[m
   useEffect(() => {[m
     if (product) {[m
       const mappedFurniture: FurnitureItem = {[m
[31m-        id: product.id,[m
[31m-        name: product.name,[m
[32m+[m[32m        id: product.product_id,[m
[32m+[m[32m        name: product.product_name,[m
         // For compatibility with ARUI[m
         width: (product.width_mm || 1000) / 1000,[m
         depth: (product.depth_mm || 1000) / 1000,[m
[36m@@ -80,12 +80,12 @@[m [mconst ARScene = forwardRef<ARSceneHandle, ARSceneProps>(({ uiOverlayRef, lastUIT[m
   }, [product, selectFurniture]);[m
 [m
   useEffect(() => {[m
[31m-    if (selectedFurniture) {[m
[32m+[m[32m    if (isARActive && selectedFurniture) {[m
       furniture.createPreviewBox(selectedFurniture);[m
     } else {[m
       furniture.clearPreviewBox();[m
     }[m
[31m-  }, [selectedFurniture, furniture.createPreviewBox, furniture.clearPreviewBox]);[m
[32m+[m[32m  }, [isARActive, selectedFurniture, furniture.createPreviewBox, furniture.clearPreviewBox]);[m
 [m
   useEffect(() => {[m
     if (clearFurnitureCounter > 0) {[m
[1mdiff --git a/Full/Frontend/src/components/ar/ARUI.tsx b/Full/Frontend/src/components/ar/ARUI.tsx[m
[1mindex 10f1dbfc..39b3bfc2 100644[m
[1m--- a/Full/Frontend/src/components/ar/ARUI.tsx[m
[1m+++ b/Full/Frontend/src/components/ar/ARUI.tsx[m
[36m@@ -83,7 +83,7 @@[m [mexport default function ARUI({ lastUITouchTimeRef }: { lastUITouchTimeRef: React[m
                 <div className={styles.dropdownContainer}>[m
                   <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className={styles.dropdownButton} disabled={isScanning}>[m
                     {selectedFurniture[m
[31m-                      ? `${selectedFurniture.name} (W:${selectedFurniture.width}, D:${selectedFurniture.depth}, H:${selectedFurniture.height})`[m
[32m+[m[32m                      ? `${selectedFurniture.name || '알 수 없는 제품'} (W:${selectedFurniture.width || 0}, D:${selectedFurniture.depth || 0}, H:${selectedFurniture.height || 0})`[m
                       : '-- 아이템 선택 --'}[m
                   </button>[m
                   {isDropdownOpen && ([m
[36m@@ -96,7 +96,7 @@[m [mexport default function ARUI({ lastUITouchTimeRef }: { lastUITouchTimeRef: React[m
                           key={item.id}[m
                           onClick={() => handleSelectItem(item.id.toString())}[m
                           className={`${styles.dropdownItem} ${selectedFurniture?.id === item.id ? styles.dropdownItemSelected : ''}`}>[m
[31m-                          {item.name} (W:{item.width}, D:{item.depth}, H:{item.height})[m
[32m+[m[32m                          {item.name || '알 수 없는 제품'} (W:{item.width || 0}, D:{item.depth || 0}, H:{item.height || 0})[m
                         </button>[m
                       ))}[m
                     </div>[m
[1mdiff --git a/Full/Frontend/src/features/ar/hooks/useFurniturePlacement.ts b/Full/Frontend/src/features/ar/hooks/useFurniturePlacement.ts[m
[1mindex cc8099ba..c45b85e1 100644[m
[1m--- a/Full/Frontend/src/features/ar/hooks/useFurniturePlacement.ts[m
[1m+++ b/Full/Frontend/src/features/ar/hooks/useFurniturePlacement.ts[m
[36m@@ -34,11 +34,10 @@[m [mexport function useFurniturePlacement([m
         }[m
     }, [sceneRef]);[m
 [m
[31m-    const createPreviewBox = useCallback((item: FurnitureItem) => { // Use FurnitureItem type[m
[31m-        if (!isARActive || !sceneRef.current) {[m
[31m-            alert("AR 세션을 먼저 시작해주세요.");[m
[31m-            return;[m
[31m-        }[m
[32m+[m[32m  const createPreviewBox = useCallback((item: FurnitureItem) => {[m
[32m+[m[32m    if (!isARActive) {[m
[32m+[m[32m      return;[m
[32m+[m[32m    }[m
         clearPreviewBox();[m
         setDebugMessage(null); // Reset debug message[m
 [m
[36m@@ -98,7 +97,9 @@[m [mexport function useFurniturePlacement([m
             const box = new Mesh(geometry, material);[m
             box.visible = false;[m
             previewModelRef.current = box;[m
[31m-            sceneRef.current.add(box);[m
[32m+[m[32m            if (sceneRef.current) {[m
[32m+[m[32m                sceneRef.current.add(box);[m
[32m+[m[32m            }[m
         }[m
     }, [isARActive, sceneRef, clearPreviewBox, setDebugMessage]);[m
 [m
[1mdiff --git a/Full/Frontend/src/lib/ar/db.ts b/Full/Frontend/src/lib/ar/db.ts[m
[1mindex 40c8a12c..b101b05b 100644[m
[1m--- a/Full/Frontend/src/lib/ar/db.ts[m
[1m+++ b/Full/Frontend/src/lib/ar/db.ts[m
[36m@@ -17,7 +17,7 @@[m [mconst pool = mysql.createPool({[m
     host: process.env.DB_HOST,         // DB 호스트 주소[m
     user: process.env.DB_USER,         // DB 사용자 이름[m
     password: process.env.DB_PASSWORD, // DB 비밀번호[m
[31m-    database: process.env.DB_NAME,     // 사용할 데이터베이스 이름[m
[32m+[m[32m    database: process.env.DB_DATABASE,     // 사용할 데이터베이스 이름[m
     port: parseInt(process.env.DB_PORT || '3306'), // DB 포트 번호[m
 [m
 });[m
