import * as THREE from 'three';

/**
 * 주어진 텍스트 메시지로 3D 공간에 표시할 수 있는 스프라이트를 생성합니다.
 * @param message - 표시할 텍스트.
 * @param opts - 폰트 크기, 색상 등 스타일 옵션.
 * @returns 텍스트가 포함된 THREE.Sprite 객체.
 */
export function makeTextSprite(message: string, opts: { fontsize: number, fontface: string, borderColor: { r: number, g: number, b: number, a: number }, backgroundColor: { r: number, g: number, b: number, a: number } }) {
  const { fontsize, fontface, borderColor, backgroundColor } = opts;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  context.font = `Bold ${fontsize}px ${fontface}`;

  context.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`;
  context.strokeStyle = `rgba(${borderColor.r}, ${borderColor.g}, ${borderColor.b}, ${borderColor.a})`;
  context.lineWidth = 4;

  context.fillStyle = "rgba(255, 255, 255, 1.0)";
  context.fillText(message, 4, fontsize + 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(0.5, 0.25, 1.0);
  return sprite;
}
