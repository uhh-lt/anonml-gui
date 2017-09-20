import {Anonymization} from './anonymization';
import {AnonymizationHandlerService} from './anonymization-handler.service';
import {Component, Input, ViewChildren, ViewChild, EventEmitter} from '@angular/core';
import {FileReference} from 'typescript';
import {HttpService} from './http.service';
import {Document} from './document';
import {HttpModule} from '@angular/http';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-control',
  templateUrl: './control.component.html',
  styleUrls: ['./control.component.css'],
  providers: [HttpService, AnonymizationHandlerService]
})
export class ControlComponent {

  private param: string;
  protected trigger = 0;
  protected fileName: string;
  protected docId: string;
  protected version: number;
  protected docFileType: string;

  protected focusReworkArea = new EventEmitter<boolean>();
  protected focusMainArea = new EventEmitter<boolean>();
  protected selectedText;
  protected tempAnonymization;


  constructor(private httpService: HttpService, protected anonymizationHanlderService: AnonymizationHandlerService,
    private activatedRoute: ActivatedRoute) {
    activatedRoute.params.subscribe(param => this.param = param.id);
    console.log(this.param);
    if (this.param === undefined || this.param === '') {
      console.log('no param found.')
    } else {
      this.httpService.getDocument(this.param).then(response =>
        this.setUpFromDocument(response)
      );
    }
    this.focusMainArea.emit(true);
  }

  updatePipe(): void {
    this.trigger++;
  }

  /**
   * Uploads the file to the backend and sets up the needed elements from the response
   * @param event contains the uploaded files
   */
  fileHandle(event): void {
    const files = event.target.files || event.srcElement.files;
    console.log(files);

    this.httpService.postFile(files).then(response =>
      this.setUpFromDocument(response)
    );
  }

  setUpFromDocument(document: Document): void {
    this.fileName = document.fileName;
    this.docId = document.id;
    this.version = document.version;
    this.docFileType = document.originalFileType;
    for (let i = 0; i < document.anonymizations.length; ++i) {
      document.anonymizations[i].id = i + 1;
    }
    this.anonymizationHanlderService.setUpParams(document.displayableText, document.anonymizations);

  }

  /**
   * Handles the operations on keypress (like a for accept)
   * @param event the catched keyboard event to check which key is pressed
   */
  keyControl(event: KeyboardEvent): void {
    switch (event.charCode) {
      case 97:
        console.log('pressed a');
        this.anonymizationHanlderService.acceptedActualAnonymization();
        this.updatePipe();
        this.save();
        break;
      case 119:
        console.log('pressed w');
        this.focusReworkArea.emit(true);

        break;
      case 100:
        console.log('pressed d');
        this.anonymizationHanlderService.declineActualAnonymization();
        this.updatePipe();
        this.save();
        break;
      case 115:
        console.log('pressed s');
        if (this.anonymizationHanlderService.getActuallyReworking() === undefined) {
          if (window.confirm('Wirklich fertig?')) {
            this.httpService.exportFile(this.docId);
            this.anonymizationHanlderService.resetDisplayableText();
          }

        } else {
          window.alert('Es sind noch offene Anonymisierungen vorhanden!')
          console.log('Document not finished!');
        }


        break;
      default:
    }
  }

  save(): void {
    this.httpService.saveFile(this.anonymizationHanlderService.getAnonymizations(), this.docId, this.version)
      .then(response => {

        console.log('Response: ' + response);
        if (response === -1) {
          if (window.confirm('Das Dokument ist nicht mehr aktuell!\nNeuen Stand laden?')) {
            this.httpService.getDocument(this.docId).then(response2 => this.setUpFromDocument(response2));
          } else {
            window.alert('Weitere �nderungen werden nicht gespeichert!');
          }
        } else {
          this.version = response;
        }
        this.httpService.unluckExport(this.docId);
      });
  }

  /**
   * Sets the focus back to the main area if 'enter' was pressed in the rework area.
   * In addition calls the necessary handler function for the reworked or added anonymization.
   */
  enterRework(): void {
    console.log('Hit Enter!');
    this.focusMainArea.emit(true);
    if (this.anonymizationHanlderService.getActuallyReworking().id === (this.anonymizationHanlderService.getMaxId() + 1)) {
      console.log('add new anonymization!');
      this.anonymizationHanlderService.addedNewAnonymization();
    } else {
      this.anonymizationHanlderService.reworkedActualAnonymization();
    }

    this.updatePipe();
    this.save();
  }

  /**
   * Sets up a new anonymization with HUMAN as producer if something of the text
   * is selected.
   */
  getSelectionText(): void {
    console.log('getSelectionText Entered.');
    let selectedText;
    if (window.getSelection) {
      selectedText = window.getSelection();
    } else if (document.getSelection) {
      selectedText = document.getSelection();
    }
    // first check for wrong selections
    if (String(selectedText) === '' || String(selectedText) === ' ') {
      return;
    }
    this.tempAnonymization = new Anonymization();
    this.tempAnonymization.data.original = selectedText.toString();
    this.tempAnonymization.data.label = 'UNKNOWN';
    this.tempAnonymization.data.replacement = '';
    this.tempAnonymization.producer = 'HUMAN';
    this.tempAnonymization.status = 'PROCESSING';
    this.tempAnonymization.id = this.anonymizationHanlderService.getMaxId() + 1;

    this.anonymizationHanlderService.setActualleReworking(this.tempAnonymization);
    this.anonymizationHanlderService.setTemporatyAnonymization();
    this.updatePipe();
    this.focusReworkArea.emit(true);
  }

}