import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import type { MissionScene } from '../types';

interface MissionCanvasProps {
  scene: MissionScene;
  onHotspotSelect: (nextScene: string) => void;
}

export function MissionCanvas({ scene, onHotspotSelect }: MissionCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    class GuardScene extends Phaser.Scene {
      preload() {
        this.load.crossOrigin = 'anonymous';
        this.load.image('bg-scene', scene.background);
      }

      create() {
        const { width, height } = this.scale;
        const bg = this.add.image(width / 2, height / 2, 'bg-scene');
        const scale = Math.max(width / bg.width, height / bg.height);
        bg.setScale(scale).setAlpha(0.25);
        this.add.rectangle(width / 2, height / 2, width, height, 0x0b1020, 0.55);
        this.cameras.main.fadeIn(350, 0, 0, 0);

        this.add.text(18, 14, `Scene: ${scene.sceneId}`, { color: '#e2e8f0', fontSize: '16px' });
        this.add.text(18, 42, 'Night Shift | GuardSim simulation view', { color: '#93c5fd', fontSize: '12px' });

        const silhouette = this.add.rectangle(width - 95, height - 110, 65, 125, 0x0b1220, 0.85);
        this.add.text(width - 126, height - 45, 'Person', { color: '#f8fafc', fontSize: '12px' });
        this.tweens.add({
          targets: silhouette,
          alpha: { from: 0.55, to: 0.95 },
          duration: 900,
          yoyo: true,
          repeat: -1,
        });

        if (scene.sceneId.includes('escalation') || scene.sceneId.includes('broken')) {
          this.cameras.main.shake(220, 0.0035);
          this.add.rectangle(width / 2, height / 2, width, height, 0x7f1d1d, 0.12);
        }

        if (scene.hotspots && scene.hotspots.length > 0) {
          scene.hotspots.forEach((hotspot, index) => {
            const y = height - 120 + index * 62;
            const button = this.add.rectangle(170, y, 260, 44, 0x2563eb).setInteractive({ useHandCursor: true });
            this.add.text(56, y - 9, hotspot.label, { color: '#ffffff', fontSize: '15px' });
            this.tweens.add({
              targets: button,
              scaleX: { from: 1, to: 1.03 },
              scaleY: { from: 1, to: 1.03 },
              yoyo: true,
              duration: 750,
              repeat: -1,
            });
            button.on('pointerdown', () => onHotspotSelect(hotspot.nextScene));
          });
        }
      }
    }

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: 760,
      height: 340,
      parent: hostRef.current,
      backgroundColor: '#0f172a',
      scene: GuardScene,
      physics: { default: 'arcade' },
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [scene, onHotspotSelect]);

  return <div className="phaser-host" ref={hostRef} />;
}
