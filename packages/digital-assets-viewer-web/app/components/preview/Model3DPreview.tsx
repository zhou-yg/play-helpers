'use client';

import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center, Html, useProgress } from '@react-three/drei';
import { Button } from '@/app/components/ui/button';
import { Asset } from '@/app/types/assets';

interface Model3DPreviewProps {
  asset: Asset;
}

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-white text-center bg-black/50 px-4 py-2 rounded">
        <p>Loading... {progress.toFixed(0)}%</p>
      </div>
    </Html>
  );
}

function Model({ asset }: Model3DPreviewProps) {
  const { scene } = useGLTF(`/api/file?path=${encodeURIComponent(asset.path)}`);
  return <primitive object={scene} />;
}

export function Model3DPreview({ asset }: Model3DPreviewProps) {
  const [autoRotate, setAutoRotate] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center gap-2 p-2 border-b">
        <Button
          variant={autoRotate ? 'default' : 'outline'}
          size="sm"
          onClick={() => setAutoRotate(!autoRotate)}
        >
          {autoRotate ? 'Stop Rotation' : 'Auto Rotate'}
        </Button>
        <span className="text-sm text-muted-foreground ml-auto">
          Drag to rotate • Scroll to zoom
        </span>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 bg-gray-900 relative">
        <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
          <directionalLight position={[-5, 3, -5]} intensity={0.4} />
          <pointLight position={[0, 5, 0]} intensity={0.5} />

          <Suspense fallback={<Loader />}>
            <Center>
              <Model asset={asset} />
            </Center>
          </Suspense>

          <OrbitControls
            autoRotate={autoRotate}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />
        </Canvas>
      </div>
    </div>
  );
}
