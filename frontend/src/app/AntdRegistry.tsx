'use client';

import React, { useMemo } from 'react';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import type Entity from '@ant-design/cssinjs/lib/Cache';
import { useServerInsertedHTML } from 'next/navigation';

const AntdRegistry = ({ children }: React.PropsWithChildren) => {
  const cache = useMemo<Entity>(() => createCache(), []);
  useServerInsertedHTML(() => (
    <style id="antd" dangerouslySetInnerHTML={{ __html: extractStyle(cache, true) }} />
  ));
  return <StyleProvider cache={cache}>{children}</StyleProvider>;
};

export default AntdRegistry;
