@echo off
rem Starts ComfyUI for the factory image pipeline (skill image-gen). Copy to D:\Gamedev\tools\ComfyUI\comfy-start.bat.
rem --disable-dynamic-vram: on this laptop the default dynamic VRAM mode left the GPU idle (~12 s per step).
cd /d "%~dp0"
start "ComfyUI" /min python_embeded\python.exe -s ComfyUI\main.py --listen 127.0.0.1 --disable-dynamic-vram
