import { mount } from 'svelte';
import './fonts.css';
import './app.css';
import App from './App.svelte';

const target = document.getElementById('app');

if (target === null) {
  throw new Error('Не найден корневой элемент #app');
}

const app = mount(App, { target });

export default app;
