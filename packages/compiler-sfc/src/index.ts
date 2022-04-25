class Mappings {
   hires: any;
   generatedCodeLine: number = 0;
   generatedCodeColumn: number = 0;
   raw: Array<any> = [];
   rawSegments: Array<any> = this.raw[this.generatedCodeLine] = [];
   pending: any = null;
   constructor(hires) {
      this.hires = hires;
   }

   addEdit() {

   }
   addUneditedChunk() {

   }
   advance() {

   }
}

class MagicString {

}

export { MagicString }