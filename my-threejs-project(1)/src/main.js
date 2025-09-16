import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 初始化场景
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a); // 更深的背景色，更符合外太阳系

// 相机 - 进一步拉远以容纳海王星轨道
let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
camera.position.set(0, 80, 350);

let clock = new THREE.Clock();
const control =  {
    key: [ 0, 0 ],
    ease: new THREE.Vector3(),
    position: new THREE.Vector3(),
    up: new THREE.Vector3( 0, 1, 0 ),
    velocity: 100,
    rotate: new THREE.Quaternion(),
};


// 渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 控制器
const orbitcontrols = new OrbitControls(camera, renderer.domElement);
orbitcontrols.enableDamping = true;

// 添加光源
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(100, 100, 100); // 进一步调整光源位置
scene.add(directionalLight);


document.addEventListener( 'keydown', onKeyDown );
document.addEventListener( 'keyup', onKeyUp );

// 添加远处的恒星背景
function createStars() {
const starsGeometry = new THREE.BufferGeometry();
const starsCount = 2000;
const positions = new Float32Array(starsCount * 3);

for (let i = 0; i < starsCount; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 10000;
    positions[i3 + 1] = (Math.random() - 0.5) * 10000;
    positions[i3 + 2] = (Math.random() - 0.5) * 10000;
}

starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2,
    transparent: true,
    opacity: 0.8
});

const stars = new THREE.Points(starsGeometry, starsMaterial);
scene.add(stars);
}
createStars();

// 创建信息面板
const infoPanel = document.createElement('div');
infoPanel.style.position = 'fixed';
infoPanel.style.bottom = '20px';
infoPanel.style.left = '50%';
infoPanel.style.transform = 'translateX(-50%)';
infoPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
infoPanel.style.color = 'white';
infoPanel.style.padding = '15px';
infoPanel.style.borderRadius = '8px';
infoPanel.style.maxWidth = '300px';
infoPanel.style.display = 'none';
infoPanel.style.zIndex = '100';
document.body.appendChild(infoPanel);

// 射线检测器
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// 存储所有可点击物体及其信息
const clickableObjects = [];
const meshToInfoMap = new Map();

// GLB模型加载器
const loader = new GLTFLoader();

// 1. 加载中心模型（太阳）
let centerModel;
loader.load(
'model/sun/scene.gltf', 
(gltf) => {
    centerModel = gltf.scene;
    centerModel.scale.set(0.3, 0.3, 0.3);
    centerModel.position.set(0, 0, 0);
    scene.add(centerModel);
    
    // 太阳的信息
    const sunInfo = {
        name: "太阳",
        description: "太阳系的中心恒星，占太阳系总质量的99.86%",
        temperature: "约5500°C",
        radius: "约696,340公里"
    };
    
    // 收集模型中所有的Mesh并标记为可点击
    const meshes = [];
    centerModel.traverse(child => {
        if (child.isMesh) {
            meshes.push(child);
            meshToInfoMap.set(child, sunInfo);
        }
    });
    
    clickableObjects.push(...meshes);
}
);

// 2. 加载地球模型
let earthModel;
const earthRotationGroup = new THREE.Group();
scene.add(earthRotationGroup);

loader.load(
'model/earth/scene.gltf',
(gltf) => {
    earthModel = gltf.scene;
    earthModel.scale.set(20, 20, 20);
    earthModel.position.set(15, 0, 0);
    earthRotationGroup.add(earthModel);
    
    // 地球的信息
    const earthInfo = {
        name: "地球",
        description: "太阳系八大行星之一，唯一已知存在生命的天体",
        distance: "约1.5亿公里（距太阳）",
        day: "约24小时（自转周期）",
        year: "约365天（公转周期）"
    };
    
    // 收集模型中所有的Mesh并标记为可点击
    const meshes = [];
    earthModel.traverse(child => {
        if (child.isMesh) {
            meshes.push(child);
            meshToInfoMap.set(child, earthInfo);
        }
    });
    
    clickableObjects.push(...meshes);
}
);

// 地球轨道
const earthOrbit = new THREE.Mesh(
new THREE.RingGeometry(15, 15.1, 64),
new THREE.MeshBasicMaterial({
    color: 0x555555,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3
})
);
earthOrbit.rotation.x = Math.PI / 2;
scene.add(earthOrbit);

// 3. 加载火星模型
let marsModel;
const marsRotationGroup = new THREE.Group();
scene.add(marsRotationGroup);

// 火星轨道
const marsOrbit = new THREE.Mesh(
new THREE.RingGeometry(25, 25.1, 64),
new THREE.MeshBasicMaterial({
    color: 0x555555,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3
})
);
marsOrbit.rotation.x = Math.PI / 2;
scene.add(marsOrbit);

// 加载火星模型
loader.load(
'model/mars/scene.gltf',
(gltf) => {
    marsModel = gltf.scene;
    marsModel.scale.set(3, 3, 3);
    marsModel.position.set(25, 0, 0);
    marsRotationGroup.add(marsModel);
    
    // 火星信息
    const marsInfo = {
        name: "火星",
        description: "太阳系第四颗行星，表面呈红色，有“红色星球”之称",
        distance: "约2.3亿公里（距太阳）",
        day: "约24.6小时（自转周期）",
        year: "约687天（公转周期）"
    };
    
    // 收集火星的Mesh
    const meshes = [];
    marsModel.traverse(child => {
        if (child.isMesh) {
            meshes.push(child);
            meshToInfoMap.set(child, marsInfo);
        }
    });
    
    clickableObjects.push(...meshes);
}

);

// 4. 金星模型
let venusModel;
const venusRotationGroup = new THREE.Group(); // 金星专属旋转容器
scene.add(venusRotationGroup);

// 金星轨道（轨道半径比地球小，设置为10）
const venusOrbit = new THREE.Mesh(
new THREE.RingGeometry(10, 10.1, 64),
new THREE.MeshBasicMaterial({
    color: 0x555555,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3
})
);
venusOrbit.rotation.x = Math.PI / 2;
scene.add(venusOrbit);

// 加载金星模型
loader.load(
'model/venus/scene.gltf', // 替换为你的金星模型路径
(gltf) => {
    venusModel = gltf.scene;
    // 金星大小比地球略小
    venusModel.scale.set(2, 2, 2);
    // 位置设置在轨道半径处
    venusModel.position.set(10, 0, 0);
    venusRotationGroup.add(venusModel);
    
    // 金星信息
    const venusInfo = {
        name: "金星",
        description: "太阳系第二颗行星，是太阳系中最热的行星",
        distance: "约1.08亿公里（距太阳）",
        day: "约243地球日（自转周期）",
        year: "约225地球日（公转周期）",
        特点: "自转方向与公转方向相反"
    };
    
    // 收集金星的Mesh并设置可点击
    const meshes = [];
    venusModel.traverse(child => {
        if (child.isMesh) {
            meshes.push(child);
            meshToInfoMap.set(child, venusInfo);
        }
    });
    
    clickableObjects.push(...meshes);
}
);

// 5. 水星模型
let mercuryModel;
const mercuryRotationGroup = new THREE.Group(); // 水星专属旋转容器
scene.add(mercuryRotationGroup);

// 水星轨道（距离太阳最近，轨道半径设置为6）
const mercuryOrbit = new THREE.Mesh(
new THREE.RingGeometry(6, 6.1, 64),
new THREE.MeshBasicMaterial({
    color: 0x555555,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3
})
);
mercuryOrbit.rotation.x = Math.PI / 2;
scene.add(mercuryOrbit);

// 加载水星模型
loader.load(
'model/mercury/scene.gltf', // 替换为你的水星模型路径
(gltf) => {
    mercuryModel = gltf.scene;
    // 水星是太阳系中最小的行星，缩放比例最小
    mercuryModel.scale.set(1, 1, 1);
    // 位置设置在轨道半径处
    mercuryModel.position.set(6, 0, 0);
    mercuryRotationGroup.add(mercuryModel);
    
    // 水星信息
    const mercuryInfo = {
        name: "水星",
        description: "太阳系中最小的行星，也是距离太阳最近的行星",
        distance: "约5800万公里（距太阳）",
        day: "约58.6地球日（自转周期）",
        year: "约88地球日（公转周期）",
        特点: "表面温差极大，白天可达430°C，夜晚低至-180°C"
    };
    
    // 收集水星的Mesh并设置可点击
    const meshes = [];
    mercuryModel.traverse(child => {
        if (child.isMesh) {
            meshes.push(child);
            meshToInfoMap.set(child, mercuryInfo);
        }
    });
    
    clickableObjects.push(...meshes);
}
);


// 7. 木星模型
let jupiterModel;
const jupiterRotationGroup = new THREE.Group(); // 木星专属旋转容器
scene.add(jupiterRotationGroup);

// 木星轨道（距离太阳较远，轨道半径设置为70）
const jupiterOrbit = new THREE.Mesh(
new THREE.RingGeometry(70, 70.1, 64),
new THREE.MeshBasicMaterial({
    color: 0x555555,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3
})
);
jupiterOrbit.rotation.x = Math.PI / 2;
scene.add(jupiterOrbit);

// 加载木星模型
loader.load(
'model/jupiter/scene.gltf', // 替换为你的木星模型路径
(gltf) => {
    jupiterModel = gltf.scene;
    // 木星是太阳系最大行星，缩放比例最大
    jupiterModel.scale.set(5, 5, 5);
    // 位置设置在轨道半径处
    jupiterModel.position.set(70, 0, 0);
    jupiterRotationGroup.add(jupiterModel);
    
    // 木星信息
    const jupiterInfo = {
        name: "木星",
        description: "太阳系中体积最大的行星，属于气态巨行星",
        distance: "约7.78亿公里（距太阳）",
        day: "约9.9小时（自转周期，太阳系中最快）",
        year: "约11.9地球年（公转周期）",
        特点: "有明显的条纹和大红斑，拥有至少79颗卫星"
    };
    
    // 收集木星的Mesh并设置可点击
    const meshes = [];
    jupiterModel.traverse(child => {
        if (child.isMesh) {
            meshes.push(child);
            meshToInfoMap.set(child, jupiterInfo);
        }
    });
    
    clickableObjects.push(...meshes);
}
);

// 8. 土星模型（带有光环的行星）
let saturnModel;
const saturnRotationGroup = new THREE.Group(); // 土星专属旋转容器
scene.add(saturnRotationGroup);

// 土星轨道（距离太阳更远，轨道半径设置为120）
const saturnOrbit = new THREE.Mesh(
new THREE.RingGeometry(120, 120.1, 64),
new THREE.MeshBasicMaterial({
    color: 0x555555,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3
})
);
saturnOrbit.rotation.x = Math.PI / 2;
scene.add(saturnOrbit);

// 加载土星模型
loader.load(
'model/saturn/scene.gltf', // 替换为你的土星模型路径
(gltf) => {
    saturnModel = gltf.scene;
    // 土星大小仅次于木星
    saturnModel.scale.set(0.1, 0.1, 0.1);
    // 位置设置在轨道半径处
    saturnModel.position.set(120, 0, 0);
    saturnRotationGroup.add(saturnModel);
    
    // 如果模型不包含光环，可以在这里添加一个简单的光环
    // 创建土星环（如果模型不自带）
    if (!hasSaturnRings(saturnModel)) {
        const ringGeometry = new THREE.RingGeometry(6, 10, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xc2b280,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        const saturnRing = new THREE.Mesh(ringGeometry, ringMaterial);
        saturnRing.rotation.x = Math.PI / 2;
        saturnModel.add(saturnRing);
        clickableObjects.push(saturnRing);
    }
    
    // 土星信息
    const saturnInfo = {
        name: "土星",
        description: "太阳系八大行星之一，以显著的光环系统而闻名",
        distance: "约14.3亿公里（距太阳）",
        day: "约10.7小时（自转周期）",
        year: "约29.5地球年（公转周期）",
        特点: "拥有最显著的光环系统，由冰粒和岩石碎片组成，至少有82颗卫星"
    };
    
    // 收集土星的Mesh并设置可点击
    const meshes = [];
    saturnModel.traverse(child => {
        if (child.isMesh) {
            meshes.push(child);
            meshToInfoMap.set(child, saturnInfo);
        }
    });
    
    clickableObjects.push(...meshes);
}
);

// 9. 天王星模型（带有独特倾斜轴的行星）
let uranusModel;
const uranusRotationGroup = new THREE.Group(); // 天王星专属旋转容器
scene.add(uranusRotationGroup);

// 天王星轨道（距离太阳更远，轨道半径设置为180）
const uranusOrbit = new THREE.Mesh(
new THREE.RingGeometry(180, 180.1, 64),
new THREE.MeshBasicMaterial({
    color: 0x555555,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3
})
);
uranusOrbit.rotation.x = Math.PI / 2;
scene.add(uranusOrbit);

// 加载天王星模型
loader.load(
'model/uranus/scene.gltf', // 替换为你的天王星模型路径
(gltf) => {
    uranusModel = gltf.scene;
    // 天王星大小比土星小，比地球大
    uranusModel.scale.set(0.1, 0.1, 0.1);
    // 位置设置在轨道半径处
    uranusModel.position.set(180, 0, 0);
    
    // 天王星最显著的特征：自转轴倾斜98度
    uranusModel.rotation.x = Math.PI / 2.05; // 约98度的倾斜
    
    uranusRotationGroup.add(uranusModel);

    // 天王星信息
    const uranusInfo = {
        name: "天王星",
        description: "太阳系第七颗行星，是一颗冰巨星",
        distance: "约28.7亿公里（距太阳）",
        day: "约17.2小时（自转周期）",
        year: "约84地球年（公转周期）",
        特点: "自转轴倾斜98度，几乎躺在公转轨道上，拥有13个已知光环和27颗卫星"
    };
    
    // 收集天王星的Mesh并设置可点击
    const meshes = [];
    uranusModel.traverse(child => {
        if (child.isMesh) {
            meshes.push(child);
            meshToInfoMap.set(child, uranusInfo);
        }
    });
    
    clickableObjects.push(...meshes);
}
);

// 10. 新增海王星模型（太阳系最外层的行星）
let neptuneModel;
const neptuneRotationGroup = new THREE.Group(); // 海王星专属旋转容器
scene.add(neptuneRotationGroup);

// 海王星轨道（距离太阳最远，轨道半径设置为250）
const neptuneOrbit = new THREE.Mesh(
new THREE.RingGeometry(250, 250.1, 64),
new THREE.MeshBasicMaterial({
    color: 0x555555,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3
})
);
neptuneOrbit.rotation.x = Math.PI / 2;
scene.add(neptuneOrbit);

// 加载海王星模型
loader.load(
'model/neptune/scene.gltf', // 替换为你的海王星模型路径
(gltf) => {
    neptuneModel = gltf.scene;
    // 海王星大小与天王星相近
    neptuneModel.scale.set(1, 1, 1);
    // 位置设置在轨道半径处
    neptuneModel.position.set(250, 0, 0);
    
    // 海王星自转轴倾斜约28.3度
    neptuneModel.rotation.x = Math.PI / 6.3; // 约28.3度的倾斜
    
    neptuneRotationGroup.add(neptuneModel);
    

    
    // 海王星信息
    const neptuneInfo = {
        name: "海王星",
        description: "太阳系第八颗行星，是距离太阳最远的行星，属于冰巨星",
        distance: "约44.9亿公里（距太阳）",
        day: "约16.1小时（自转周期）",
        year: "约165地球年（公转周期）",
        特点: "拥有太阳系中最强烈的风暴，风速可达2,100公里/小时，有5个已知光环和14颗卫星"
    };
    
    // 收集海王星的Mesh并设置可点击
    const meshes = [];
    neptuneModel.traverse(child => {
        if (child.isMesh) {
            meshes.push(child);
            meshToInfoMap.set(child, neptuneInfo);
        }
    });
    
    clickableObjects.push(...meshes);
}
);

function aa(delta) {
    const ease = control.ease;
    const up = control.up;
    const key = control.key;
    const velocity = control.velocity;
    const azimuth = orbitcontrols.getAzimuthalAngle();
    const rotate = control.rotate;
    const position = control.position;
    ease.set( key[ 1 ], 0, key[ 0 ] ).multiplyScalar( velocity * delta );
    control.ease.applyAxisAngle( up, azimuth );
    // const angle = unwrapRad( Math.atan2( ease.x, ease.z ) + azimuth );
    // rotate.setFromAxisAngle( up, angle );
    control.ease.applyAxisAngle( up, azimuth );
    position.add( ease );
    camera.position.add( ease );

}

function unwrapRad( r ) {

	return Math.atan2( Math.sin( r ), Math.cos( r ) );

}

function onKeyDown( event ) {

	const key = control.key;
	switch ( event.code ) {

		case 'ArrowUp': case 'KeyW': key[ 0 ] = - 1; break;
		case 'ArrowDown': case 'KeyS': key[ 0 ] = 1; break;
		case 'ArrowLeft': case 'KeyA': case 'KeyQ': key[ 1 ] = - 1; break;
		case 'ArrowRight': case 'KeyD': key[ 1 ] = 1; break;
		
	}
}

function onKeyUp( event ) {
	const key = control.key;
	switch ( event.code ) {

	case 'ArrowUp': case 'KeyW':  key[ 0 ] = key[ 0 ] < 0 ? 0 : key[ 0 ]; break;
	case 'ArrowDown': case 'KeyS': key[ 0 ] = key[ 0 ] > 0 ? 0 : key[ 0 ]; break;
	case 'ArrowLeft': case 'KeyA': case 'KeyQ': key[ 1 ] = key[ 1 ] < 0 ? 0 : key[ 1 ]; break;
	case 'ArrowRight': case 'KeyD': key[ 1 ] = key[ 1 ] > 0 ? 0 : key[ 1 ]; break;
	
}
}

// 处理鼠标点击事件
function onMouseClick(event) {
    // 计算鼠标在标准化设备坐标中的位置 (-1 到 1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 更新射线投射器
    raycaster.setFromCamera(mouse, camera);

    // 检测与可点击物体的交集
    const intersects = raycaster.intersectObjects(clickableObjects, false);

    // 调试：打印检测到的对象
    console.log("检测到的交集:", intersects.map(i => i.object.name));

    // 如果有交集，显示第一个物体的信息
    if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const info = meshToInfoMap.get(clickedMesh);
        
        if (info) {
            displayInfo(info);
            return;
        }
    }

    // 没有点击到物体，隐藏信息面板
    infoPanel.style.display = 'none';
}

// 显示物体信息
function displayInfo(info) {
    let infoHtml = `<h3 style="margin: 0 0 10px 0">${info.name}</h3>`;
    for (const [key, value] of Object.entries(info)) {
        if (key !== 'name') {
            infoHtml += `<p style="margin: 5px 0">${key}: ${value}</p>`;
        }
    }
    
    infoPanel.innerHTML = infoHtml;
    infoPanel.style.display = 'block';
}

// 添加点击事件监听
window.addEventListener('click', onMouseClick);

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    aa( delta );


    // 太阳自转
    if (centerModel) centerModel.rotation.y += 0.01;

    // 地球公转和自转
    if (earthRotationGroup) earthRotationGroup.rotation.y += 0.005;
    if (earthModel) earthModel.rotation.y += 0.02;

    // 火星公转和自转（速度比地球慢）
    if (marsRotationGroup) marsRotationGroup.rotation.y += 0.003;
    if (marsModel) marsModel.rotation.y += 0.018;

    // 金星公转和自转（金星自转非常缓慢且方向相反）
    if (venusRotationGroup) venusRotationGroup.rotation.y += 0.007; // 公转速度比地球快
    if (venusModel) venusModel.rotation.y -= 0.001; // 负号表示逆向自转

    // 水星公转和自转（距离太阳最近，公转速度最快）
    if (mercuryRotationGroup) mercuryRotationGroup.rotation.y += 0.012; // 公转速度最快
    if (mercuryModel) mercuryModel.rotation.y += 0.008; // 自转速度较慢


    // 木星公转和自转（气态巨行星自转快、公转慢）
    if (jupiterRotationGroup) jupiterRotationGroup.rotation.y += 0.001; // 公转速度很慢
    if (jupiterModel) jupiterModel.rotation.y += 0.04; // 自转速度非常快

    // 土星公转和自转
    if (saturnRotationGroup) saturnRotationGroup.rotation.y += 0.0007; // 公转速度比木星更慢
    if (saturnModel) saturnModel.rotation.y += 0.038; // 自转速度快

    // 天王星公转和自转
    if (uranusRotationGroup) uranusRotationGroup.rotation.y += 0.0004; // 公转速度更慢
    if (uranusModel) uranusModel.rotation.y += 0.035; // 自转速度

    // 海王星公转和自转
    if (neptuneRotationGroup) neptuneRotationGroup.rotation.y += 0.0001; // 公转速度最慢
    if (neptuneModel) neptuneModel.rotation.y += 0.032; // 自转速度

    orbitcontrols.update();
    renderer.render(scene, camera);
}
animate();

// 窗口大小调整
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
    