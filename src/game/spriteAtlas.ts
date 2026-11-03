export class SpriteAtlas {
  private image: HTMLImageElement;
  public isLoaded: boolean = false;

  constructor(imageSrc: string) {
    this.image = new Image();
    this.image.src = imageSrc;

    this.image.onload = () => {
      this.isLoaded = true;
      console.log('SpriteAtlas 1024x1024 carregado com sucesso!');
    };

    this.image.onerror = (err) => {
      console.error('ERRO ao carregar a imagem do Atlas:', err);
    };
  }

  public draw(
    ctx: CanvasRenderingContext2D,
    col: number,
    row: number,
    destX: number,
    destY: number,
    destSize: number,
    srcW: number = 63,
    srcH: number = 66,
  ) {
    if (!this.isLoaded) {
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(destX - destSize / 2, destY - destSize / 2, destSize, destSize);
      return;
    }

    // Grelha 16x16 exata num atlas de 1024x1024 (64px por célula)
    const cellWidth = this.image.width / 16;
    const cellHeight = this.image.height / 16;

    // Alinhamento ao canto superior esquerdo de cada célula da grelha
    const srcX = col * cellWidth;
    const srcY = row * cellHeight;

    ctx.drawImage(
      this.image,
      srcX,
      srcY,
      srcW,
      srcH,
      destX - destSize / 2,
      destY - destSize / 2,
      destSize,
      destSize,
    );
  }
}
