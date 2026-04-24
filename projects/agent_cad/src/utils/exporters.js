/**
 * exportSTEP: replicad Worker를 통해 STEP 파일 내보내기
 * @param {Function} exportStepFn - useReplicadWorker hook의 exportStep 함수
 * @param {Array} objects - CAD 객체 배열 (operation 필드가 있는 것만 처리)
 */
export async function exportSTEP(exportStepFn, objects) {
  const solidObjects = objects.filter((obj) => obj.operation != null)
  if (solidObjects.length === 0) {
    throw new Error('STEP 내보내기: solid operation이 있는 객체가 없습니다.')
  }

  const payload = solidObjects.map((obj) => ({
    operation: obj.operation,
    transform: obj.transform,
    name: obj.name,
  }))

  const stepBytes = await exportStepFn(payload)
  downloadBlob(stepBytes, 'model.step', 'application/STEP')
}

export function downloadBlob(data, filename, mimeType) {
  const blob = new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function exportSTEPFromCode(exportStepFromCodeFn, code) {
  if (!code) throw new Error('내보낼 코드가 없습니다.')
  const stepBytes = await exportStepFromCodeFn(code)
  downloadBlob(stepBytes, 'model.step', 'application/STEP')
}

export async function exportSTL(scene) {
  const { STLExporter } = await import('three/addons/exporters/STLExporter.js')
  const exporter = new STLExporter()
  const result = exporter.parse(scene, { binary: true })
  downloadBlob(result, 'model.stl', 'application/octet-stream')
}

export async function exportGLTF(scene) {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js')
  const exporter = new GLTFExporter()
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (gltf) => {
        const output = JSON.stringify(gltf, null, 2)
        downloadBlob(output, 'model.gltf', 'application/json')
        resolve()
      },
      reject,
      { binary: false }
    )
  })
}
