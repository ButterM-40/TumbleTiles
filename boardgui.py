from __future__ import absolute_import
from tkinter import *
from PIL import Image, ImageDraw
import tumbletiles as TT
from time import time

def redrawCanvas(board, boardwidth, boardheight, canvas, tilesize, textcolor = "#000000", gridcolor = "#000000", b_drawGrid = False, b_drawLoc = False):
    canvas.delete(ALL)
    drawGrid(board, boardwidth, boardheight, canvas, tilesize, gridcolor, b_drawGrid, b_drawLoc)

    for p in board.Polyominoes:
            
        for tile in p.Tiles:
            assert(tile.uid and tile.uid != 0)

            color = tile.color
            board.rectangles[tile.uid] = canvas.create_rectangle(tilesize*tile.x, tilesize*tile.y, tilesize*tile.x + tilesize, tilesize*tile.y + tilesize, fill = color)

            if tile.name:
                board.nameText[tile.uid] = canvas.create_text((tilesize / 2) + tilesize*tile.x, (tilesize / 2) + tilesize*tile.y, text=tile.name, fill=textcolor, font=('', tilesize//2))

            if 'N' in tile.glues or 'E' in tile.glues or 'S' in tile.glues or 'W' in tile.glues:
                board.glueText[tile.uid] = { 'N': 0, 'E': 0, 'S': 0, 'W': 0 }
            else:
                board.glueText[tile.uid] = None 

            if board.glueText[tile.uid]:

                # DRAW THE GLUES
                if tile.glues[0] != "None":
                    board.glueText[tile.uid]['N'] = canvas.create_text(tilesize*tile.x + tilesize//2, tilesize*tile.y + tilesize//5, text = tile.glues[0], fill=textcolor, font=('',tilesize//5))
                if tile.glues[1] != "None": 
                    board.glueText[tile.uid]['E'] = canvas.create_text(tilesize*tile.x + tilesize - tilesize//5, tilesize*tile.y + tilesize//2, text = tile.glues[1], fill=textcolor, font=('',tilesize//5))
                if tile.glues[2] != "None": 
                    board.glueText[tile.uid]['S'] = canvas.create_text(tilesize*tile.x + tilesize//2, tilesize*tile.y+ tilesize - tilesize//5, text = tile.glues[2], fill=textcolor, font=('',tilesize//5))
                if tile.glues[3] != "None": 
                    board.glueText[tile.uid]['W'] = canvas.create_text(tilesize*tile.x + tilesize//5, tilesize*tile.y + tilesize//2, text = tile.glues[3], fill=textcolor, font=('',tilesize//5))

    for c in board.ConcreteTiles:
        canvas.create_rectangle(tilesize*c.x, tilesize*c.y, tilesize*c.x + tilesize, tilesize*c.y + tilesize, fill = "#686868")


def drawPILImage(board, boardwidth, boardheight, canvas, tilesize, textcolor = "#000000", gridcolor = "#000000", b_drawGrid = False, b_drawLoc = False, tileRes = 100, lineWidth=10):

    tileSize = tileRes
    
    im = Image.new("RGB", (boardwidth * tileSize, boardheight * tileSize), color="#FFFFFF")
    draw = ImageDraw.Draw(im)


    for p in board.Polyominoes:
        for tile in p.Tiles:
            color = tile.color

            PILDrawTile(draw, tile.x, tile.y, tileSize, color, lineWidth)

    color="#686868"

    for c in board.ConcreteTiles:
        PILDrawTile(draw, c.x, c.y, tileSize, color, lineWidth)



    # im.save("test.png", "PNG")
    return im


def PILDrawTile(image, x, y, tileSize, color, lineWidth):
    image.rectangle((x * tileSize - lineWidth / 2, y * tileSize - lineWidth / 2, x * tileSize + tileSize + lineWidth / 2, y * tileSize  + tileSize + lineWidth /2), fill =0, outline=0)
    image.rectangle((x * tileSize + lineWidth / 2, y * tileSize + lineWidth / 2, x * tileSize + tileSize - lineWidth / 2, y * tileSize + tileSize- lineWidth / 2 ), fill =color, outline=0)






def deleteTumbleTiles(board, boardwidth, boardheight, canvas, tilesize, textcolor = "#000000", gridcolor = "#000000", b_drawGrid = False, b_drawLoc = False):
        i = 0
        while i < len(board.rectangles):
                canvas.delete(board.rectangles[i])
                i=i+1
        i = 0
        while i < len(board.glueText):
                canvas.delete(board.glueText[i])
                i=i+1
                
def redrawTumbleTiles(board: TT.Board, boardwidth, boardheight, canvas: Canvas, tilesize, textcolor = "#000000", gridcolor = "#000000", b_drawGrid = False, b_drawLoc = False):
    for p in board.Polyominoes:
        for tile in p.Tiles:
            rect_id = board.rectangles[tile.uid]
            canvas.coords(rect_id, tilesize*tile.x, tilesize*tile.y, tilesize*tile.x + tilesize, tilesize*tile.y + tilesize)
            # board.tk_batched_update_buffer.append(canvas.coords, rect_id, tilesize*tile.x, tilesize*tile.y, tilesize*tile.x + tilesize, tilesize*tile.y + tilesize)

            if tile.uid in board.nameText:
                canvas.coords(board.nameText[tile.uid], (tilesize / 2) + tilesize*tile.x, (tilesize / 2) + tilesize*tile.y)

            if board.glueText[tile.uid]:
                glue_n_id = board.glueText[tile.uid]['N']
                glue_e_id = board.glueText[tile.uid]['E']
                glue_s_id = board.glueText[tile.uid]['S']
                glue_w_id = board.glueText[tile.uid]['W']

                if glue_n_id: canvas.coords(glue_n_id, tilesize*tile.x + tilesize//2, tilesize*tile.y + tilesize//5)
                if glue_e_id: canvas.coords(glue_e_id, tilesize*tile.x + tilesize - tilesize//5, tilesize*tile.y + tilesize//2)
                if glue_s_id: canvas.coords(glue_s_id, tilesize*tile.x + tilesize//2, tilesize*tile.y+ tilesize - tilesize//5)
                if glue_w_id: canvas.coords(glue_w_id, tilesize*tile.x + tilesize//5, tilesize*tile.y + tilesize//2)


def drawGrid(board, boardwidth, boardheight, canvas, tilesize, gridcolor = "#000000", b_drawGrid = False, b_drawLoc = False):
    if b_drawGrid == True:
        for row in range(board.Rows):
            canvas.create_line(0, row*tilesize, boardwidth*tilesize, row*tilesize, fill=gridcolor, width=.50)
        for col in range(board.Cols):
            canvas.create_line(col*tilesize, 0, col*tilesize, boardheight*tilesize, fill=gridcolor, width=.50)
                
    if b_drawLoc == True:
        for row in range(boardheight):
            for col in range(boardwidth):
                canvas.create_text(tilesize*(col+1) - tilesize//2, tilesize*(row+1) - tilesize//2, text = "("+str(row)+","+str(col)+")", fill=gridcolor,font=('',tilesize//5))

