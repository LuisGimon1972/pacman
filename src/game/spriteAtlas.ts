// src/game/spriteAtlas.ts

export class SpriteAtlas {
  private image: HTMLImageElement;
  public isLoaded: boolean = false;

  constructor(imageSrc: string) {
    this.image = new Image();
    this.image.src = imageSrc;

    this.image.onload = () => {
      this.isLoaded = true;
      console.log(`SpriteAtlas carregado com sucesso: ${imageSrc}`);
    };

    this.image.onerror = (err) => {
      console.error(`ERRO ao carregar a imagem do Atlas em: ${imageSrc}`, err);
    };
  }

  /**
   * Desenha um sprite específico do atlas no Canvas
   * @param ctx Contexto 2D do Canvas
   * @param col Coluna do sprite no atlas
   * @param row Linha do sprite no atlas
   * @param tileSize Tamanho de cada célula do sprite (ex: 32x32 ou 64x64)
   * @param destX Posição X no Canvas do jogo
   * @param destY Posição Y no Canvas do jogo
   */
  public draw(
    ctx: CanvasRenderingContext2D,
    col: number,
    row: number,
    tileSize: number,
    destX: number,
    destY: number,
    destSize: number = tileSize,
  ) {
    // Se a imagem ainda não carregou, desenha um quadrado magenta de aviso
    if (!this.isLoaded) {
      ctx.fillStyle = '#ff00ff'; // Cor de placeholder (magenta)
      ctx.fillRect(destX - destSize / 2, destY - destSize / 2, destSize, destSize);
      return;
    }

    const srcX = col * tileSize;
    const srcY = row * tileSize;

    ctx.drawImage(
      this.image,
      srcX,
      srcY,
      tileSize,
      tileSize, // Recorte na imagem original
      destX - destSize / 2,
      destY - destSize / 2,
      destSize,
      destSize, // Posição de destino centralizada
    );
  }
}
