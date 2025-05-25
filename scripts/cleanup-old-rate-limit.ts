#!/usr/bin/env node
import { unlink } from 'fs/promises'
import { join } from 'path'

async function cleanup() {
  try {
    // Remove old rate-limit.ts file since we're using the new middleware
    const oldFile = join(process.cwd(), 'lib', 'rate-limit.ts')
    await unlink(oldFile)
    console.log('✅ Removed old rate-limit.ts file')
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      console.log('ℹ️  Old rate-limit.ts file already removed')
    } else {
      console.error('❌ Error during cleanup:', error)
    }
  }
}

cleanup()